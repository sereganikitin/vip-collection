'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  hint?: string;
}

export default function ImageUpload({ value, onChange, folder = 'banners', label, hint }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  }

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-gray-100">
          <div className="relative aspect-[16/9] w-full">
            <Image src={value} alt="Превью" fill className="object-cover" sizes="600px" unoptimized={value.startsWith('/uploads/')} />
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center text-danger"
            title="Удалить"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-black/50 text-white text-xs font-mono truncate">
            {value}
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-text-muted">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Загрузка...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-text-muted">
              <Upload size={24} />
              <span className="text-sm font-medium">Нажмите или перетащите изображение</span>
              <span className="text-xs">JPG, PNG, WebP — до 10 МБ</span>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={onSelectFile}
      />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Или вставьте путь вручную: /images/..."
        className="w-full mt-2 px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent text-xs font-mono"
      />

      {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
