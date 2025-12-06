import { Modal } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

interface AIConfigPromptModalProps {
  open: boolean
  onConfig: () => void
  onCancel: () => void
}

/**
 * AI 配置提示弹窗组件
 * 用于提示用户配置 AI 服务
 */
export const AIConfigPromptModal = ({ open, onConfig, onCancel }: AIConfigPromptModalProps) => {
  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '22px' }} />
          <span>AI 服务未配置</span>
        </div>
      }
      onOk={onConfig}
      onCancel={onCancel}
      okText="去配置"
      cancelText="稍后再说"
      width={520}
      centered
      maskClosable={false}
      okButtonProps={{
        type: 'primary',
        size: 'large',
      }}
      cancelButtonProps={{
        size: 'large',
      }}
    >
      <div style={{ padding: '20px 0' }}>
        <p style={{ 
          marginBottom: '16px', 
          fontSize: '15px',
          color: '#262626',
          lineHeight: '1.6'
        }}>
          检测到您还未配置 AI 服务。
        </p>
        
        <p style={{ 
          marginBottom: '16px', 
          fontSize: '15px',
          color: '#262626',
          lineHeight: '1.6'
        }}>
          <strong style={{ color: '#1890ff' }}>绘画猜词</strong> 需要配置 <strong>视觉模型</strong> API Key，
          <strong style={{ color: '#52c41a' }}>AI 画你猜</strong> 需要配置 <strong>文生图模型</strong> API Key。
        </p>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #fffbea 0%, #fff8e1 100%)', 
          border: '1px solid #ffe58f', 
          borderRadius: '8px', 
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(255, 193, 7, 0.1)'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '8px'
          }}>
            <span style={{ 
              fontSize: '20px',
              marginRight: '10px',
              lineHeight: '1.4'
            }}>💡</span>
            <div style={{ flex: 1 }}>
              <p style={{ 
                margin: '0 0 8px 0', 
                fontSize: '15px',
                fontWeight: 600,
                color: '#262626'
              }}>
                推荐方案：百度飞桨 AI Studio
              </p>
              <p style={{ 
                fontSize: '14px', 
                color: '#595959', 
                margin: 0,
                lineHeight: '1.5'
              }}>
                • 零成本使用，注册即可获得<br />
                • 支持视觉识别和图像生成
              </p>
            </div>
          </div>
        </div>
        
        <div style={{ 
          background: '#f6f6f6',
          borderLeft: '3px solid #1890ff',
          padding: '12px 16px',
          borderRadius: '4px'
        }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#595959', 
            margin: 0,
            lineHeight: '1.6'
          }}>
            <span style={{ marginRight: '6px' }}>🔗</span>
            获取方式：访问{' '}
            <a 
              href="https://aistudio.baidu.com/account/accessToken" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#1890ff',
                textDecoration: 'none',
                fontWeight: 500,
                borderBottom: '1px dashed #1890ff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderBottom = '1px solid #1890ff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderBottom = '1px dashed #1890ff'
              }}
            >
              百度 AI Studio
            </a>
            {' '}注册并获取 Access Token
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default AIConfigPromptModal
