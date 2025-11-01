import React, { useEffect, useState } from 'react';
import { Modal, Dropdown, Button, message } from 'antd';
import { HeartFilled, FilterOutlined, DeleteOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../utils/api';
import { useUser } from '../context/UserContext';
import AppSidebar from '../components/AppSidebar';
import SidebarTrigger from '../components/SidebarTrigger';
import AppFooter from '../components/AppFooter';
import './Gallery.css';

interface GalleryItem {
  filename: string;
  name: string;
  timestamp: string;
  likes: number;
  image_data: string; // base64 encoded image data (required)
}

const Gallery: React.FC = () => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'time-desc' | 'time-asc' | 'likes-desc' | 'likes-asc'>('time-desc');
  const { isAdmin } = useUser();

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gallery/list`);
      if (response.ok) {
        const data = await response.json();
        // Ensure each item has a likes field
        const itemsWithLikes = data.map((item: any) => ({
          ...item,
          likes: item.likes || 0
        }));
        const sortedItems = sortGalleryItems(itemsWithLikes);
        setGalleryItems(sortedItems);
      } else {
        console.error('Failed to fetch gallery items');
      }
    } catch (error) {
      console.error('Error fetching gallery items:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortGalleryItems = (items: GalleryItem[], sortType?: 'time-desc' | 'time-asc' | 'likes-desc' | 'likes-asc') => {
    const currentSortBy = sortType || sortBy;
    return [...items].sort((a, b) => {
      switch (currentSortBy) {
        case 'time-desc':
          return b.timestamp.localeCompare(a.timestamp);
        case 'time-asc':
          return a.timestamp.localeCompare(b.timestamp);
        case 'likes-desc':
          return b.likes - a.likes;
        case 'likes-asc':
          return a.likes - b.likes;
        default:
          return 0;
      }
    });
  };

  const handleSortChange = (value: 'time-desc' | 'time-asc' | 'likes-desc' | 'likes-asc') => {
    setSortBy(value);
    const sortedItems = sortGalleryItems(galleryItems, value);
    setGalleryItems(sortedItems);
  };

  const sortMenuItems = [
    {
      key: 'time-desc',
      label: '最新优先',
      onClick: () => handleSortChange('time-desc')
    },
    {
      key: 'time-asc',
      label: '最早优先',
      onClick: () => handleSortChange('time-asc')
    },
    {
      key: 'likes-desc',
      label: '点赞最多',
      onClick: () => handleSortChange('likes-desc')
    },
    {
      key: 'likes-asc',
      label: '点赞最少',
      onClick: () => handleSortChange('likes-asc')
    }
  ];

  const handleLike = async (filename: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/gallery/like/${filename}`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        // Update local state with the new likes count and re-sort
        setGalleryItems(prevItems => {
          const updatedItems = prevItems.map(item =>
            item.filename === filename
              ? { ...item, likes: result.likes }
              : item
          );
          return sortGalleryItems(updatedItems);
        });
      } else {
        console.error('Failed to like gallery item');
      }
    } catch (error) {
      console.error('Error liking gallery item:', error);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/gallery/${filename}`, {
        method: 'DELETE',
        headers: {
          'session-id': localStorage.getItem('sessionId') || '',
        },
      });

      if (response.ok) {
        message.success('删除成功');
        setGalleryItems(prevItems => prevItems.filter(item => item.filename !== filename));
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('Error deleting gallery item:', error);
      message.error('删除失败');
    }
  };

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      <div className="gallery-container">
        {/* 标题区域 */}
        <div className="gallery-title-section">
          <h1 className="gallery-page-title">画廊</h1>
          <Dropdown
            menu={{ items: sortMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<FilterOutlined />}
              className="gallery-filter-button"
              aria-label="排序筛选"
            />
          </Dropdown>
        </div>

        {/* 画廊内容区域 */}
        <div className="gallery-content">
          {galleryItems.length > 0 ? (
            <div className="gallery-grid">
              {galleryItems.map((item) => (
                <div key={item.filename} className="gallery-item">
                  <img
                    src={item.image_data!}
                    alt={`由 ${item.name} 绘制`}
                    className="gallery-image"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setPreviewImg(item.image_data!);
                      setPreviewVisible(true);
                    }}
                  />
                  <div className="gallery-info">
                    <p className="gallery-name">{item.name}</p>
                    <div className="gallery-stats">
                      <button
                        className="gallery-like-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(item.filename);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#ff4d4f',
                          fontSize: '16px'
                        }}
                      >
                        <HeartFilled />
                        <span style={{ fontSize: '14px', color: '#666' }}>
                          {item.likes || 0}
                        </span>
                      </button>
                      {isAdmin && (
                        <button
                          className="gallery-delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.filename);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#ff4d4f',
                            fontSize: '16px',
                            marginLeft: '8px'
                          }}
                        >
                          <DeleteOutlined />
                        </button>
                      )}
                      <p className="gallery-timestamp">{item.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gallery-empty">
              <p>画廊中还没有作品，快去绘制并发布吧！</p>
            </div>
          )}
        </div>

        <AppFooter />
      </div>
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
        bodyStyle={{ textAlign: 'center', padding: 0 }}
      >
        {previewImg && (
          <img
            src={previewImg}
            alt="大图预览"
            style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto' }}
          />
        )}
      </Modal>
    </>
  );
};

export default Gallery;