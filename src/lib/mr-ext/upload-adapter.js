/**
 * Adaptador de upload para a extensão MR Sem Limites (v17).
 * Script clássico que expõe `globalThis.UploadManager`.
 */
(function attachUploadManager(root) {
  const UploadManager = {
    MAX_FILE_SIZE: Infinity,
    MAX_FILES: 0xF,
    BUCKET_NAME: 'mr-ext-uploads',

    uploadFile(file, options, onProgress) {
      return new Promise((resolve, reject) => {
        if (!file) {
          reject(new Error('Arquivo não fornecido'));
          return;
        }

        const auth = options || {};
        const licenseKey = auth.license_key || auth.licenseKey || auth.key || auth.chave;
        const hwid = auth.hwid || auth.device_id || auth.deviceId;
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        formData.append('file', file);
        if (licenseKey) formData.append('license_key', licenseKey);
        if (hwid) formData.append('hwid', hwid);

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && typeof onProgress === 'function') {
            onProgress(Math.round((event.loaded / event.total) * 100), event.loaded, event.total);
          }
        });

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response.url || response);
            } catch {
              resolve({ ok: true, raw: xhr.responseText });
            }
            return;
          }

          try {
            reject(JSON.parse(xhr.responseText));
          } catch {
            reject({ ok: false, status: xhr.status, error: 'upload_failed', body: xhr.responseText });
          }
        };

        xhr.onerror = () => reject({ ok: false, error: 'network_error' });
        xhr.ontimeout = () => reject({ ok: false, error: 'upload_timeout' });
        xhr.open('POST', 'https://mrsemlimitespro.lovable.app/api/public/ext/upload');
        xhr.send(formData);
      });
    },

    isImageType(type) {
      return Boolean(type && type.startsWith('image/'));
    },

    isVideoType(type) {
      return Boolean(type && (type.startsWith('video/') || type.endsWith('mp4') || type.endsWith('webm')));
    },

    getFileIcon(type, fileName = '') {
      const extension = fileName.split('.').pop().toLowerCase();
      if (this.isImageType(type) || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return '🖼️';
      if (this.isVideoType(type) || ['mp4', 'webm', 'mov', 'avi'].includes(extension)) return '🎬';
      if ((type || '').includes('pdf') || extension === 'pdf') return '📕';
      if ((type || '').includes('zip') || (type || '').includes('rar') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return '📦';
      if ((type || '').includes('word') || (type || '').includes('document') || ['doc', 'docx'].includes(extension)) return '📝';
      if ((type || '').includes('excel') || (type || '').includes('sheet') || ['xls', 'xlsx', 'csv'].includes(extension)) return '📊';
      if ((type || '').includes('audio') || ['mp3', 'wav', 'ogg'].includes(extension)) return '🎵';
      return '📄';
    },

    formatFileSize(size) {
      if (!size) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const index = Math.floor(Math.log(size) / Math.log(1024));
      return `${parseFloat((size / Math.pow(1024, index)).toFixed(1))} ${units[index]}`;
    },

    formatFilesPayload(files) {
      if (!files || files.length === 0) return '';
      if (files.length === 1) return files[0].url || '';
      return JSON.stringify(files.map((file) => ({
        url: file.url || file.publicUrl,
        name: file.name || file.file_name,
        type: ((file.type || file.file_type || '').split('/')[0] || 'file'),
      })));
    },
  };

  root.UploadManager = UploadManager;
})(typeof globalThis !== 'undefined' ? globalThis : window);
