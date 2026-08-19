/**
 * Adaptador de Upload para a Extensão MR Sem Limites (v17)
 * Este arquivo deve ser injetado na extensão.
 */
export const UploadManager = {
  uploadFile: function(file, options, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append('file', file);
      formData.append('license_key', options.license_key || options.licenseKey || options.key);
      formData.append('hwid', options.hwid || options.device_id);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && typeof onProgress === 'function') {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent, event.loaded, event.total);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              resolve({ ok: true, raw: xhr.responseText });
            }
          } else {
            try {
              reject(JSON.parse(xhr.responseText));
            } catch (e) {
              reject({ ok: false, status: xhr.status, error: 'upload_failed' });
            }
          }
        }
      };

      // URL base do MR CENTRAL publicado
      xhr.open('POST', 'https://mrsemlimitespro.lovable.app/api/public/ext/upload');
      xhr.send(formData);
    });
  }
};
