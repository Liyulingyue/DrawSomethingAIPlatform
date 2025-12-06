import { getAIRequestConfig, createAIRequestBody, isAIConfigValid, getAIConfig } from './aiConfig'

/**
 * 图像分析请求参数
 */
export interface ImageAnalysisRequest {
  image: string // base64 编码的图像数据
  targetWord: string // 目标词汇
  prompt?: string // 自定义提示词
}

/**
 * AI 分析结果
 */
export interface AIAnalysisResult {
  success: boolean
  confidence: number // 置信度 0-1
  analysis: string // 分析描述
  suggestion?: string // 改进建议
  error?: string // 错误信息
}

/**
 * 调用 AI 服务分析绘画图像
 */
export const analyzeDrawing = async (request: ImageAnalysisRequest): Promise<AIAnalysisResult> => {
  try {
    // 检查配置是否有效
    if (!isAIConfigValid(undefined, 'vision')) {
      return {
        success: false,
        confidence: 0,
        analysis: '配置错误',
        error: '视觉模型配置不完整，请先在设置页面配置视觉模型服务参数'
      }
    }

    // 获取配置信息
    const { url, headers } = getAIRequestConfig('vision')

    // 构建提示词
    const defaultPrompt = `请分析这幅绘画是否表现了"${request.targetWord}"。

分析要求：
1. 仔细观察图像中的线条、形状、结构
2. 判断是否能识别出目标词汇的特征
3. 给出0-1之间的置信度分数（1为完全匹配）
4. 提供具体的分析说明
5. 如果识别度不高，请给出改进建议

请用JSON格式返回结果：
{
  "confidence": 0.8,
  "analysis": "详细分析描述",
  "suggestion": "改进建议（可选）"
}`

    const finalPrompt = request.prompt || defaultPrompt

    // 构建请求消息
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: finalPrompt
          },
          {
            type: 'image',
            image: request.image
          }
        ]
      }
    ]

    // 创建请求体
    const requestBody = createAIRequestBody(messages, 'vision', {
      temperature: 0.3, // 较低的温度值，保证结果稳定
      max_tokens: 500,
      top_p: 0.8
    })

    // 发送请求
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // 解析响应
    if (data.choices && data.choices.length > 0) {
      const content = data.choices[0].message?.content
      
      try {
        // 尝试解析 JSON 响应
        const parsed = JSON.parse(content)
        return {
          success: true,
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
          analysis: parsed.analysis || content,
          suggestion: parsed.suggestion
        }
      } catch {
        // 如果不是 JSON，直接使用文本内容
        return {
          success: true,
          confidence: 0.5, // 默认置信度
          analysis: content || '分析完成，但无法获取详细结果'
        }
      }
    } else {
      throw new Error('API 响应格式异常')
    }

  } catch (error) {
    console.error('AI 分析失败:', error)
    return {
      success: false,
      confidence: 0,
      analysis: '分析失败',
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 生成绘画建议
 */
export const generateDrawingSuggestion = async (targetWord: string): Promise<string> => {
  try {
    if (!isAIConfigValid(undefined, 'vision')) {
      return '请先配置视觉模型服务以获取绘画建议'
    }

    const { url, headers } = getAIRequestConfig('vision')

    const prompt = `请为绘画主题"${targetWord}"提供简洁的绘画建议，包括：
1. 关键特征和形状
2. 重要的细节部分
3. 简单易懂的绘画技巧

请用简洁明了的语言，不超过100字。`

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ]

    const requestBody = createAIRequestBody(messages, 'vision', {
      temperature: 0.7,
      max_tokens: 200
    })

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || '暂时无法获取绘画建议'

  } catch (error) {
    console.error('获取绘画建议失败:', error)
    return '获取建议失败，请检查网络连接和 AI 配置'
  }
}

/**
 * 检查 AI 服务连接状态
 * 参考标准 OpenAI API 格式发送测试请求
 * curl https://api.openai.com/v1/chat/completions \
 * -H "Content-Type: application/json" \
 * -H "Authorization: Bearer $OPENAI_API_KEY" \
 * -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "Hello!"}]}'
 */
export const testAIConnection = async (modelType: 'vision' | 'image' = 'vision'): Promise<{ success: boolean; message: string }> => {
  console.log(`🚀 testAIConnection 函数开始执行 (${modelType === 'vision' ? '视觉模型' : '文生图模型'})`)
  
  try {
    console.log(`🔍 检查 ${modelType === 'vision' ? '视觉模型' : '文生图模型'} 配置有效性...`)
    if (!isAIConfigValid(undefined, modelType)) {
      console.log('❌ AI 配置无效')
      return {
        success: false,
        message: `${modelType === 'vision' ? '视觉模型' : '文生图模型'}配置不完整，请检查 URL、API Key 和模型名称`
      }
    }
    console.log('✅ AI 配置有效')

    console.log('🔧 获取配置信息...')
    const config = getAIConfig()
    const url = modelType === 'vision' ? config.visionUrl : config.imageUrl
    const modelName = modelType === 'vision' ? config.visionModelName : config.imageModelName
    const hasKey = modelType === 'vision' ? !!config.visionKey : !!config.imageKey
    
    console.log('📋 当前配置:', {
      url,
      modelName,
      hasKey
    })
    
    const { url: requestUrl, headers } = getAIRequestConfig(modelType)
    console.log('🌐 请求配置:', { requestUrl, headers })

    // 构造标准 OpenAI 格式的测试请求
    const requestBody = {
      model: modelName,
      messages: [
        {
          role: "user",
          content: "Hello!"
        }
      ]
    }

    console.log('📤 准备发送请求...')
    console.log('请求 URL:', url)
    console.log('请求头:', headers)
    console.log('请求体:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    console.log('📥 收到响应:', response.status, response.statusText)

    if (response.ok) {
      const data = await response.json()
      console.log('响应数据:', data)
      
      // 检查标准 OpenAI API 响应格式
      // 期望格式: { "choices": [{ "message": { "content": "回复内容" } }] }
      const reply = data.choices?.[0]?.message?.content
      if (reply && reply.trim().length > 0) {
        return {
          success: true,
          message: `AI 服务连接正常！回复: "${reply.trim()}"`
        }
      } else {
        return {
          success: false,
          message: '连接成功但响应格式不符合 OpenAI 标准或无回复内容'
        }
      }
    } else {
      const errorText = await response.text().catch(() => '无法读取错误信息')
      console.error('API 错误响应:', errorText)
      return {
        success: false,
        message: `连接失败: ${response.status} ${response.statusText}`
      }
    }

  } catch (error) {
    console.error('连接测试异常:', error)
    return {
      success: false,
      message: `连接异常: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}