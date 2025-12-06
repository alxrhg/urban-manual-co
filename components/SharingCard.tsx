'use client';

import { useState } from 'react';
import { Share2, Download, X } from 'lucide-react';

interface SharingCardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  stats?: {
    label: string;
    value: string | number;
  }[];
  variant?: 'collection' | 'destination' | 'profile';
}

export function SharingCard({ title, subtitle, imageUrl, stats, variant = 'collection' }: SharingCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateImage = async () => {
    // Feature disabled - html2canvas not installed
    // To enable: npm install html2canvas
    alert('Image download feature coming soon! For now, use the Share Link button below.');
    return;

    /* Disabled until html2canvas is installed
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById('sharing-card-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-urbanmanual.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image.');
    } finally {
      setIsGenerating(false);
    }
    */
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: subtitle || 'Check this out on The Urban Manual',
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
      >
        <Share2 className="h-4 w-4" />
        <span>Share</span>
      </button>

      {/* Sharing Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-light">Share</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:opacity-60 transition-opacity"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview Card */}
            <div className="mb-6">
              <div
                id="sharing-card-content"
                className="relative w-full aspect-[1.91/1] bg-gradient-to-br from-black to-gray-800 rounded-2xl overflow-hidden p-8 flex flex-col justify-between"
              >
                {/* Background Image */}
                {imageUrl && (
                  <div className="absolute inset-0 opacity-20">
                    <img
                      src={imageUrl}
                      alt={`Background image for ${title}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="relative z-10">
                  <h4 className="text-2xl font-light text-white mb-2 line-clamp-2">
                    {title}
                  </h4>
                  {subtitle && (
                    <p className="text-sm text-gray-300 line-clamp-1">
                      {subtitle}
                    </p>
                  )}
                </div>

                {/* Stats */}
                {stats && stats.length > 0 && (
                  <div className="relative z-10 flex gap-6">
                    {stats.map((stat, index) => (
                      <div key={index}>
                        <div className="text-2xl font-light text-white mb-1">
                          {stat.value}
                        </div>
                        <div className="text-xs text-gray-400 uppercase">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Branding */}
                <div className="absolute bottom-6 right-8 z-10">
                  <div className="text-white text-sm font-medium">
                    The Urban Manual
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleGenerateImage}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{isGenerating ? 'Generating...' : 'Download Image'}</span>
              </button>

              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Share2 className="h-4 w-4" />
                <span>Share Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
