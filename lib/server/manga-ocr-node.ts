import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import * as ort from 'onnxruntime-node'
import sharp from 'sharp'

type Detection = {
  det_id: number
  cls_name: string
  conf: number
  box: [number, number, number, number]
  ocr_text: string
  ocr_error: string
}

type ImageRaw = {
  data: Buffer
  width: number
  height: number
  channels: number
}

type Box = {
  x1: number
  y1: number
  x2: number
  y2: number
  conf: number
}

type LineCrop = {
  buffer: Buffer
  x1: number
  x2: number
  y1: number
  y2: number
}

const YOLO_MODEL_PATH = resolveModelPath('DETECT_MODEL_PATH', 'yolo.onnx')
const OCR_REC_MODEL_PATH = resolveModelPath('OCR_REC_ONNX_PATH', 'paddleocr_v5_rec.onnx')
const OCR_REC_DICT_PATH = resolveModelPath('OCR_REC_DICT_PATH', 'paddleocr_v5_dict.txt')
const OCR_LATIN_REC_MODEL_PATH = resolveModelPath('OCR_LATIN_REC_ONNX_PATH', 'paddleocr_v5_latin_rec.onnx')
const OCR_LATIN_REC_DICT_PATH = resolveModelPath('OCR_LATIN_REC_DICT_PATH', 'paddleocr_v5_latin_dict.txt')

const DETECT_IMAGE_SIZE = Number(process.env.NODE_OCR_DETECT_IMAGE_SIZE || 640)
const DETECT_CONF = Number(process.env.DETECT_CONF || 0.4)
const DETECT_IOU = Number(process.env.DETECT_IOU || 0.6)
const DETECT_MIN_BOX_AREA = Number(process.env.DETECT_MIN_BOX_AREA || 400)
const DETECT_MAX_BOXES = Number(process.env.NODE_OCR_DETECT_MAX_BOXES || 96)
const CROP_MARGIN = Number(process.env.DETECT_MARGIN || 12)
const OCR_LINE_HEIGHT = Number(process.env.NODE_OCR_LINE_HEIGHT || 48)
const OCR_MAX_LINE_WIDTH = Number(process.env.NODE_OCR_MAX_LINE_WIDTH || 960)

let runtimePromise: Promise<NodeOcrRuntime> | null = null

export async function extractTextBoxesNode(imageBytes: Buffer) {
  const runtime = await getRuntime()
  return runtime.extractTextBoxes(imageBytes)
}

export async function recognizeImageTextNode(imageBytes: Buffer, timeoutSec = 10) {
  const runtime = await getRuntime()
  return runtime.recognizeImageText(imageBytes, timeoutSec)
}

function getRuntime() {
  runtimePromise ||= NodeOcrRuntime.create()
  return runtimePromise
}

function resolveModelPath(envKey: string, fileName: string) {
  return process.env[envKey] || path.join(/*turbopackIgnore: true*/ process.cwd(), 'models', fileName)
}

class NodeOcrRuntime {
  private constructor(
    private readonly yoloSession: ort.InferenceSession,
    private readonly recSession: ort.InferenceSession,
    private readonly recDict: string[],
    private readonly latinRecSession: ort.InferenceSession | null,
    private readonly latinRecDict: string[]
  ) {}

  static async create() {
    assertModelFile(YOLO_MODEL_PATH, 'YOLO')
    assertModelFile(OCR_REC_MODEL_PATH, 'PP-OCR recognition')
    assertModelFile(OCR_REC_DICT_PATH, 'PP-OCR dictionary')

    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
      intraOpNumThreads: resolveIntraOpThreads(),
      interOpNumThreads: 1,
      // Silencia os warnings "Removing initializer ..." do carregamento dos
      // modelos PaddleOCR (initializers não usados no grafo) — só loga erros.
      logSeverityLevel: 3,
    }
    const yoloSession = await ort.InferenceSession.create(YOLO_MODEL_PATH, sessionOptions)
    const recSession = await ort.InferenceSession.create(OCR_REC_MODEL_PATH, sessionOptions)
    const recDict = readPaddleDict(OCR_REC_DICT_PATH)

    let latinRecSession: ort.InferenceSession | null = null
    let latinRecDict: string[] = []
    if (fs.existsSync(OCR_LATIN_REC_MODEL_PATH) && fs.existsSync(OCR_LATIN_REC_DICT_PATH)) {
      latinRecSession = await ort.InferenceSession.create(OCR_LATIN_REC_MODEL_PATH, sessionOptions)
      latinRecDict = readPaddleDict(OCR_LATIN_REC_DICT_PATH)
    }

    return new NodeOcrRuntime(yoloSession, recSession, recDict, latinRecSession, latinRecDict)
  }

  async extractTextBoxes(imageBytes: Buffer) {
    const started = performance.now()
    const timings: Record<string, number> = {}

    const tDecode = performance.now()
    const raw = await decodeRgb(imageBytes)
    timings.decode = elapsedMs(tDecode)

    const tDetect = performance.now()
    const boxes = await this.detectBalloons(imageBytes, raw.width, raw.height)
    timings.detect = elapsedMs(tDetect)

    const tOcr = performance.now()
    const detections: Detection[] = []
    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index]
      const cropBox = expandBox(box, raw.width, raw.height, CROP_MARGIN)
      let text = ''
      let error = ''
      try {
        text = await this.extractTextFromCrop(imageBytes, cropBox)
      } catch (err) {
        error = err instanceof Error ? err.message : 'OCR falhou.'
      }

      detections.push({
        det_id: index,
        cls_name: 'class_0',
        conf: box.conf,
        box: [Math.round(box.x1), Math.round(box.y1), Math.round(box.x2), Math.round(box.y2)],
        ocr_text: text,
        ocr_error: error,
      })
    }
    timings.ocr = elapsedMs(tOcr)

    const slowestStage = Object.entries(timings).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    return {
      width: raw.width,
      height: raw.height,
      detections_count: detections.length,
      elapsed_ms: elapsedMs(started),
      timings_ms: timings,
      slowest_stage: slowestStage,
      detections,
    }
  }

  async recognizeImageText(imageBytes: Buffer, timeoutSec: number) {
    const started = performance.now()
    const deadline = started + (Math.max(1, timeoutSec) * 1000)
    const lines = await segmentTextLines(imageBytes)
    const recognized: string[] = []
    const errors: string[] = []

    for (const line of lines.slice(0, 20)) {
      if (performance.now() > deadline) {
        errors.push('timeout: usando resultado parcial')
        break
      }
      try {
        const text = await this.recognizeLine(line.buffer)
        if (text) recognized.push(text)
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'OCR de linha falhou')
      }
    }

    return {
      extracted_text: normalizeOcrText(recognized.join('\n')),
      elapsed_ms: elapsedMs(started),
      timeout_sec: Math.round(timeoutSec),
      ocr_variant_best: 'node-onnx-recognition',
      ocr_error: errors.join(' | '),
    }
  }

  private async detectBalloons(imageBytes: Buffer, originalWidth: number, originalHeight: number) {
    const input = await sharp(imageBytes)
      .rotate()
      .resize(DETECT_IMAGE_SIZE, DETECT_IMAGE_SIZE, { fit: 'fill' })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer()

    const floatData = new Float32Array(3 * DETECT_IMAGE_SIZE * DETECT_IMAGE_SIZE)
    const plane = DETECT_IMAGE_SIZE * DETECT_IMAGE_SIZE
    for (let y = 0; y < DETECT_IMAGE_SIZE; y += 1) {
      for (let x = 0; x < DETECT_IMAGE_SIZE; x += 1) {
        const src = (y * DETECT_IMAGE_SIZE + x) * 3
        const dst = y * DETECT_IMAGE_SIZE + x
        floatData[dst] = input[src] / 255
        floatData[plane + dst] = input[src + 1] / 255
        floatData[(plane * 2) + dst] = input[src + 2] / 255
      }
    }

    const tensor = new ort.Tensor('float32', floatData, [1, 3, DETECT_IMAGE_SIZE, DETECT_IMAGE_SIZE])
    const feeds: Record<string, ort.Tensor> = { [this.yoloSession.inputNames[0]]: tensor }
    const output = await this.yoloSession.run(feeds)
    const firstOutput = output[this.yoloSession.outputNames[0]]
    const boxes = decodeYoloOutput(firstOutput, originalWidth, originalHeight)
    return nonMaxSuppression(boxes, DETECT_IOU).slice(0, DETECT_MAX_BOXES)
  }

  private async extractTextFromCrop(imageBytes: Buffer, box: Box) {
    const crop = await sharp(imageBytes)
      .rotate()
      .extract({
        left: Math.max(0, Math.floor(box.x1)),
        top: Math.max(0, Math.floor(box.y1)),
        width: Math.max(1, Math.floor(box.x2 - box.x1)),
        height: Math.max(1, Math.floor(box.y2 - box.y1)),
      })
      .png()
      .toBuffer()

    const lines = await segmentTextLines(crop)
    const recognized: string[] = []
    for (const line of lines.slice(0, 8)) {
      const text = await this.recognizeLine(line.buffer)
      if (text) recognized.push(text)
    }
    return normalizeOcrText(recognized.join('\n'))
  }

  private async recognizeLine(lineBuffer: Buffer) {
    const main = await this.recognizeLineWith(this.recSession, this.recDict, lineBuffer)
    if (!this.latinRecSession || scoreText(main) >= 10) return main

    const latin = await this.recognizeLineWith(this.latinRecSession, this.latinRecDict, lineBuffer)
    return scoreText(latin) > scoreText(main) ? latin : main
  }

  private async recognizeLineWith(session: ort.InferenceSession, dict: string[], lineBuffer: Buffer) {
    const { data, width } = await prepareRecognitionInput(lineBuffer)
    const tensor = new ort.Tensor('float32', data, [1, 3, OCR_LINE_HEIGHT, width])
    const output = await session.run({ [session.inputNames[0]]: tensor })
    const logits = output[session.outputNames[0]]
    return ctcDecode(logits, dict)
  }
}

function assertModelFile(filePath: string, label: string) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} não encontrado: ${filePath}`)
  const header = fs.readFileSync(filePath, { encoding: null, flag: 'r' }).subarray(0, 48).toString('utf8')
  if (header.startsWith('version https://git-lfs.github.com/spec/v1')) {
    throw new Error(`${label} parece ser ponteiro Git LFS, não modelo real: ${filePath}`)
  }
}

function resolveIntraOpThreads() {
  const configured = Number(process.env.NODE_OCR_INTRA_OP_THREADS || process.env.OCR_INTRA_OP_THREADS || 0)
  if (Number.isFinite(configured) && configured > 0) return Math.floor(configured)
  const cpuCount = Math.max(1, Number(process.env.NODE_OCR_CPU_COUNT || 0) || 2)
  return Math.max(1, Math.min(4, Math.floor(cpuCount / 2) || 1))
}

function readPaddleDict(filePath: string) {
  const entries = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).map((line) => line.replace(/\r$/, ''))
  while (entries.length > 0 && entries[entries.length - 1] === '') entries.pop()
  return ['<blank>', ...entries, ' ']
}

async function decodeRgb(imageBytes: Buffer): Promise<ImageRaw> {
  const { data, info } = await sharp(imageBytes)
    .rotate()
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true })
  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  }
}

function decodeYoloOutput(output: ort.Tensor, originalWidth: number, originalHeight: number) {
  const dims = output.dims
  const data = output.data as Float32Array
  const rows = Number(dims[1])
  const anchors = Number(dims[2])
  const scaleX = originalWidth / DETECT_IMAGE_SIZE
  const scaleY = originalHeight / DETECT_IMAGE_SIZE
  const boxes: Box[] = []

  for (let anchor = 0; anchor < anchors; anchor += 1) {
    const x = data[anchor]
    const y = data[anchors + anchor]
    const w = data[(anchors * 2) + anchor]
    const h = data[(anchors * 3) + anchor]
    const confidence = data[(anchors * 4) + anchor]
    const classConfidence = rows > 5 ? data[(anchors * 5) + anchor] : 1
    const conf = confidence * (classConfidence > 0.01 ? classConfidence : 1)
    if (conf < DETECT_CONF) continue

    const x1 = clamp((x - (w / 2)) * scaleX, 0, originalWidth)
    const y1 = clamp((y - (h / 2)) * scaleY, 0, originalHeight)
    const x2 = clamp((x + (w / 2)) * scaleX, 0, originalWidth)
    const y2 = clamp((y + (h / 2)) * scaleY, 0, originalHeight)
    const area = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
    if (area < DETECT_MIN_BOX_AREA) continue
    boxes.push({ x1, y1, x2, y2, conf })
  }

  boxes.sort((a, b) => b.conf - a.conf)
  return boxes
}

function nonMaxSuppression(boxes: Box[], iouThreshold: number) {
  const picked: Box[] = []
  for (const box of boxes) {
    if (picked.some((existing) => iou(existing, box) > iouThreshold)) continue
    picked.push(box)
  }
  picked.sort((a, b) => (a.y1 - b.y1) || (a.x1 - b.x1))
  return picked
}

function iou(a: Box, b: Box) {
  const x1 = Math.max(a.x1, b.x1)
  const y1 = Math.max(a.y1, b.y1)
  const x2 = Math.min(a.x2, b.x2)
  const y2 = Math.min(a.y2, b.y2)
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1)
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1)
  return intersection / Math.max(1, areaA + areaB - intersection)
}

function expandBox(box: Box, width: number, height: number, margin: number): Box {
  return {
    x1: clamp(box.x1 - margin, 0, width - 1),
    y1: clamp(box.y1 - margin, 0, height - 1),
    x2: clamp(box.x2 + margin, 1, width),
    y2: clamp(box.y2 + margin, 1, height),
    conf: box.conf,
  }
}

async function segmentTextLines(cropBuffer: Buffer): Promise<LineCrop[]> {
  const { data, info } = await sharp(cropBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const width = info.width
  const height = info.height
  if (width <= 0 || height <= 0) return [{ buffer: cropBuffer, x1: 0, x2: width, y1: 0, y2: height }]

  const values = Array.from(data)
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  const darkInk = mean >= 128
  const threshold = darkInk ? Math.max(0, mean - 34) : Math.min(255, mean + 34)
  const rowCounts = new Array<number>(height).fill(0)
  const xStart = Math.max(0, Math.floor(width * 0.10))
  const xEnd = Math.min(width, Math.ceil(width * 0.90))
  const scanWidth = Math.max(1, xEnd - xStart)

  for (let y = 0; y < height; y += 1) {
    let count = 0
    for (let x = xStart; x < xEnd; x += 1) {
      const value = data[(y * width) + x]
      if (darkInk ? value < threshold : value > threshold) count += 1
    }
    rowCounts[y] = count
  }

  const minInk = Math.max(2, Math.floor(scanWidth * 0.018))
  const ranges: Array<[number, number]> = []
  let start = -1
  for (let y = 0; y < height; y += 1) {
    if (rowCounts[y] >= minInk) {
      if (start < 0) start = y
    } else if (start >= 0) {
      if (y - start >= 3) ranges.push([start, y - 1])
      start = -1
    }
  }
  if (start >= 0 && height - start >= 3) ranges.push([start, height - 1])

  const merged = mergeLineRanges(ranges, 2)
    .map(([y1, y2]) => [Math.max(0, y1 - 3), Math.min(height, y2 + 4)] as [number, number])
    .filter(([y1, y2]) => y2 - y1 >= 4)

  const rangeHeights = merged.map(([y1, y2]) => y2 - y1).sort((a, b) => a - b)
  const medianRangeHeight = rangeHeights[Math.floor(rangeHeights.length / 2)] || 0
  const saneMerged = merged.filter(([y1, y2]) => {
    const lineHeight = y2 - y1
    const isBorderBand = (y1 <= 2 || y2 >= height - 2) && medianRangeHeight > 0 && lineHeight > medianRangeHeight * 1.5
    const isTooTall = medianRangeHeight > 0
      ? lineHeight > Math.max(12, medianRangeHeight * 2.8)
      : lineHeight > height * 0.55
    return !isBorderBand && !isTooTall
  })
  const usable = saneMerged.length > 0 ? saneMerged : [[0, height] as [number, number]]
  const lines: LineCrop[] = []
  for (const [y1, y2] of usable) {
    const [x1, x2] = lineInkBounds(data, width, height, y1, y2, darkInk, threshold)
    const buffer = await sharp(cropBuffer)
      .extract({ left: x1, top: y1, width: Math.max(1, x2 - x1), height: Math.max(1, y2 - y1) })
      .png()
      .toBuffer()
    lines.push({ buffer, x1, x2, y1, y2 })
  }
  return lines
}

function lineInkBounds(
  data: Buffer,
  width: number,
  height: number,
  y1: number,
  y2: number,
  darkInk: boolean,
  threshold: number
): [number, number] {
  let left = width
  let right = -1
  const minY = clamp(Math.floor(y1), 0, height)
  const maxY = clamp(Math.ceil(y2), minY + 1, height)
  const minX = Math.max(0, Math.floor(width * 0.08))
  const maxX = Math.min(width, Math.ceil(width * 0.92))

  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const value = data[(y * width) + x]
      const isInk = darkInk ? value < threshold : value > threshold
      if (!isInk) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
    }
  }

  if (right < left) return [0, width]

  const pad = Math.max(2, Math.floor(width * 0.015))
  return [
    clamp(left - pad, 0, width - 1),
    clamp(right + pad + 1, 1, width),
  ]
}

function mergeLineRanges(ranges: Array<[number, number]>, gap: number) {
  if (ranges.length === 0) return []
  const merged: Array<[number, number]> = [ranges[0]]
  for (const range of ranges.slice(1)) {
    const prev = merged[merged.length - 1]
    if (range[0] - prev[1] <= gap) {
      prev[1] = range[1]
    } else {
      merged.push([...range])
    }
  }
  return merged
}

async function prepareRecognitionInput(lineBuffer: Buffer) {
  const metadata = await sharp(lineBuffer).metadata()
  const sourceWidth = Math.max(1, metadata.width || OCR_LINE_HEIGHT)
  const sourceHeight = Math.max(1, metadata.height || OCR_LINE_HEIGHT)
  let width = Math.max(16, Math.round((sourceWidth / sourceHeight) * OCR_LINE_HEIGHT))
  width = Math.min(OCR_MAX_LINE_WIDTH, Math.max(16, Math.ceil(width / 8) * 8))

  const raw = await sharp(lineBuffer)
    .resize(width, OCR_LINE_HEIGHT, { fit: 'fill' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer()

  const floatData = new Float32Array(3 * OCR_LINE_HEIGHT * width)
  const plane = OCR_LINE_HEIGHT * width
  for (let y = 0; y < OCR_LINE_HEIGHT; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * 3
      const dst = y * width + x
      floatData[dst] = ((raw[src] / 255) - 0.5) / 0.5
      floatData[plane + dst] = ((raw[src + 1] / 255) - 0.5) / 0.5
      floatData[(plane * 2) + dst] = ((raw[src + 2] / 255) - 0.5) / 0.5
    }
  }

  return { data: floatData, width }
}

function ctcDecode(output: ort.Tensor, dict: string[]) {
  const dims = output.dims.map(Number)
  const data = output.data as Float32Array
  const timeSteps = dims.length === 3 ? dims[1] : dims[0]
  const classes = dims.length === 3 ? dims[2] : dims[1]
  const batchOffset = dims.length === 3 ? 0 : 0
  let prev = -1
  let text = ''

  for (let t = 0; t < timeSteps; t += 1) {
    let bestIndex = 0
    let bestValue = -Infinity
    const offset = batchOffset + (t * classes)
    for (let c = 0; c < classes; c += 1) {
      const value = data[offset + c]
      if (value > bestValue) {
        bestValue = value
        bestIndex = c
      }
    }
    if (bestIndex !== 0 && bestIndex !== prev) {
      text += dict[bestIndex] ?? ''
    }
    prev = bestIndex
  }

  return normalizeOcrText(text)
}

function normalizeOcrText(value: string) {
  return value
    .replace(/\u3000/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function scoreText(value: string) {
  const normalized = normalizeOcrText(value)
  if (!normalized) return 0
  const letters = normalized.replace(/[^\p{L}\p{N}]/gu, '').length
  const replacement = (normalized.match(/[�□]/g) || []).length
  return letters - (replacement * 4)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function elapsedMs(started: number) {
  return Math.max(0, Math.round(performance.now() - started))
}
