import { useEffect, useMemo, useState } from 'react'
import { Layout, message } from 'antd'
import Navbar from '../components/Navbar'
import SingleTester, { type ModelConfig, type SingleHistoryEntry } from '../components/drawing/SingleTester'
import { api } from '../utils/api'
import { type GuessPayload } from '../hooks/useDrawingRoom'
import './DrawingRoom.css'

const { Content } = Layout

const DEFAULT_MODEL_PROMPT = ''

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  url: 'https://aistudio.baidu.com/llm/lmapi/v3',
  key: '',
  model: 'ernie-4.5-vl-28b-a3b',
  prompt: DEFAULT_MODEL_PROMPT,
  callPreference: 'server',
}

const MODEL_CONFIG_STORAGE_KEY = 'drawing-single-model-config'

const sanitizeModelConfig = (config: ModelConfig) => ({
  url: config.url.trim(),
  key: config.key.trim(),
  model: config.model.trim(),
  prompt: config.prompt.trim(),
  callPreference: config.callPreference,
})

function normalizeGuessPayload(raw: unknown): GuessPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const data = raw as Record<string, unknown>
  const bestGuessValue = data.best_guess ?? data.label ?? data.text ?? null
  const best_guess =
    typeof bestGuessValue === 'string'
      ? bestGuessValue
      : bestGuessValue != null
        ? String(bestGuessValue)
        : null

  const alternativesRaw = data.alternatives
  const alternatives = Array.isArray(alternativesRaw)
    ? alternativesRaw.map((item) => (typeof item === 'string' ? item : String(item))).filter(Boolean)
    : alternativesRaw != null
      ? [String(alternativesRaw)]
      : []

  const matchedRaw = data.matched
  const matched = typeof matchedRaw === 'boolean' ? matchedRaw : undefined

  const matchedWithRaw = data.matched_with
  const matched_with = typeof matchedWithRaw === 'string' ? matchedWithRaw : undefined

  const targetRaw = data.target
  const target_word = typeof targetRaw === 'string' ? targetRaw : undefined

  return {
    ...(raw as GuessPayload),
    best_guess,
    alternatives,
    matched,
    matched_with,
    target_word,
  }
}

function SingleGame() {
  const [singleTarget, setSingleTarget] = useState('')
  const [singleResult, setSingleResult] = useState<GuessPayload | null>(null)
  const [singleHistory, setSingleHistory] = useState<SingleHistoryEntry[]>([])
  const [singleSubmitting, setSingleSubmitting] = useState(false)
  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_MODEL_CONFIG }
    }
    try {
      const stored = window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ModelConfig>
        return {
          ...DEFAULT_MODEL_CONFIG,
          ...parsed,
        }
      }
    } catch (error) {
      console.warn('解析单人模型配置失败，使用默认值', error)
    }
    return { ...DEFAULT_MODEL_CONFIG }
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(modelConfig))
    } catch (error) {
      console.warn('保存单人模型配置失败', error)
    }
  }, [modelConfig])

  const sanitizedCurrentModelConfig = useMemo(() => sanitizeModelConfig(modelConfig), [modelConfig])

  const handleModelConfigChange = (patch: Partial<ModelConfig>) => {
    setModelConfig((prev) => ({
      ...prev,
      ...patch,
    }))
  }

  const handleSingleSubmit = async (image: string) => {
    setSingleSubmitting(true)
    try {
      const requestBody: {
        image: string
        target?: string
        config?: {
          url?: string
          key?: string
          model?: string
          prompt?: string
        }
        call_preference?: 'custom' | 'server'
      } = {
        image,
        target: singleTarget.trim() || undefined,
      }

      const configPayload: {
        url?: string
        key?: string
        model?: string
        prompt?: string
      } = {}

      if (sanitizedCurrentModelConfig.url) {
        configPayload.url = sanitizedCurrentModelConfig.url
      }
      if (sanitizedCurrentModelConfig.key) {
        configPayload.key = sanitizedCurrentModelConfig.key
      }
      if (sanitizedCurrentModelConfig.model) {
        configPayload.model = sanitizedCurrentModelConfig.model
      }
      configPayload.prompt = sanitizedCurrentModelConfig.prompt

      requestBody.config = configPayload

      // 添加调用偏好参数
      requestBody.call_preference = sanitizedCurrentModelConfig.callPreference || 'server'

      const response = await api.post('/ai/guess', requestBody)
      const normalized = normalizeGuessPayload(response.data)
      if (!normalized) {
        setSingleResult(null)
        message.warning('AI 未返回有效结果，请稍后重试')
        return
      }
      setSingleResult(normalized)
      const createdAt = Math.floor(Date.now() / 1000)
      setSingleHistory((prev) => [
        {
          id: createdAt,
          target: singleTarget.trim(),
          createdAt,
          guess: normalized,
        },
        ...prev,
      ].slice(0, 10))
      message.success('AI 猜词结果已更新')
    } catch (error) {
      console.error('单人测试失败', error)
      message.error('单人测试失败，请稍后重试')
    } finally {
      setSingleSubmitting(false)
    }
  }

  const handleResetSingle = () => {
    setSingleResult(null)
    setSingleHistory([])
    message.success('已清空单人测试记录')
  }

  const handleTestConfig = async (image: string) => {
    setSingleSubmitting(true)
    try {
      const requestBody: {
        image: string
        target?: string
        config: {
          url?: string
          key?: string
          model?: string
          prompt?: string
        }
        call_preference?: 'custom' | 'server'
      } = {
        image,
        target: singleTarget.trim() || undefined,
        config: {
          url: sanitizedCurrentModelConfig.url || undefined,
          key: sanitizedCurrentModelConfig.key || undefined,
          model: sanitizedCurrentModelConfig.model || undefined,
          prompt: sanitizedCurrentModelConfig.prompt,
        },
      }

      // 添加调用偏好参数
      requestBody.call_preference = sanitizedCurrentModelConfig.callPreference || 'server'

      const response = await api.post('/ai/guess', requestBody)
      const normalized = normalizeGuessPayload(response.data)
      if (!normalized) {
        setSingleResult(null)
        message.warning('AI 未返回有效结果，请检查配置')
        return
      }
      setSingleResult(normalized)
      const createdAt = Math.floor(Date.now() / 1000)
      setSingleHistory((prev) => [
        {
          id: createdAt,
          target: singleTarget.trim(),
          createdAt,
          guess: normalized,
        },
        ...prev,
      ].slice(0, 10))
      message.success('配置测试完成')
    } catch (error: any) {
      console.error('配置测试失败', error)
      const errorMessage = error?.response?.data?.error || error?.message || '未知错误'
      message.error(`配置测试失败: ${errorMessage}`)
    } finally {
      setSingleSubmitting(false)
    }
  }

  return (
    <Layout className="drawing-layout">
      <Navbar />
      <Content className="drawing-content">
        <div className="drawing-container">
          <SingleTester
            target={singleTarget}
            onTargetChange={setSingleTarget}
            onSubmit={(image) => {
              void handleSingleSubmit(image)
            }}
            submitting={singleSubmitting}
            onReset={handleResetSingle}
            result={singleResult}
            history={singleHistory}
            modelConfig={modelConfig}
            onModelConfigChange={handleModelConfigChange}
            onTestConfig={handleTestConfig}
          />
        </div>
      </Content>
    </Layout>
  )
}

export default SingleGame
