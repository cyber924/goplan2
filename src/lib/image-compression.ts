
/**
 * 이미지를 크롭 및 압축하여 크기를 최적화하고 특정 KB 이하로 축소하는 유틸리티
 */
export async function compressImage(dataUri: string, targetSizeKB: number = 100, maxDimension: number = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUri;
    img.crossOrigin = "anonymous"; // 외부 URL 방지용 CORS 대응
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 프로필에 알맞는 완벽한 정사각형 크롭 및 타겟 해상도 리사이징
      const size = Math.min(img.width, img.height);
      canvas.width = maxDimension;
      canvas.height = maxDimension;

      // 이미지 중심 기준 크롭 후 캔버스에 드로잉
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, maxDimension, maxDimension);

      // WebP 지원 확인 및 포맷 결정
      let quality = 0.85;
      let format = 'image/webp';
      let resultDataUri = canvas.toDataURL('image/webp', quality);
      
      if (!resultDataUri.startsWith('data:image/webp')) {
        resultDataUri = canvas.toDataURL('image/jpeg', quality);
        format = 'image/jpeg';
      }

      const getByteSize = (uri: string) => {
        const base64 = uri.split(',')[1];
        return Math.floor((base64.length * 3) / 4) / 1024;
      };

      let currentSize = getByteSize(resultDataUri);
      
      // 타겟 사이즈(기본 100KB) 이하가 될 때까지 점진적 압축 품질 저하
      while (currentSize > targetSizeKB && quality > 0.15) {
        quality -= 0.1;
        resultDataUri = canvas.toDataURL(format, quality);
        currentSize = getByteSize(resultDataUri);
      }

      console.log(`Compressed Profile Photo: ${currentSize.toFixed(2)}KB (Quality: ${quality}, Format: ${format})`);
      resolve(resultDataUri);
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
  });
}
