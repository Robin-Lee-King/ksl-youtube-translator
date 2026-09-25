import { useEffect, useState } from "react";

interface Props {
  src: string;
  style?: React.CSSProperties;
  alt?: string;
  tolerance?: number;
}

export default function TransparentImg({ src, style, alt = "", tolerance = 40 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Sample background color from top-left corner pixel
      const bgR = data[0], bgG = data[1], bgB = data[2];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        if (dist < tolerance) {
          // Fade out near-background pixels smoothly
          data[i + 3] = Math.round((dist / tolerance) * data[i + 3]);
        }
      }

      ctx.putImageData(new ImageData(data, width, height), 0, 0);
      setDataUrl(canvas.toDataURL("image/png"));
    };
    img.src = src;
  }, [src, tolerance]);

  if (!dataUrl) return <img src={src} alt={alt} style={style} />;
  return <img src={dataUrl} alt={alt} style={style} />;
}
