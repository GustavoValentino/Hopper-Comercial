// src/app/(components)/AppleSplashScreens.tsx
//
// Componente Server (sem "use client") — só retorna tags <link>.
// O React 19 (usado pelo Next.js 16) hoisting automático move qualquer
// <link>/<meta>/<title> encontrado na árvore de componentes para o
// <head> do documento, não importa onde ele seja renderizado.
//
// Renderize isso no layout.tsx, junto com os outros componentes no <body>:
//   import AppleSplashScreens from "./(components)/AppleSplashScreens";
//   ...
//   <AppleSplashScreens />

interface SplashDevice {
  width: number; // largura em pontos CSS (não pixels físicos)
  height: number;
  ratio: number; // device pixel ratio
}

const DEVICES: SplashDevice[] = [
  { width: 375, height: 667, ratio: 2 },
  { width: 414, height: 896, ratio: 2 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 440, height: 956, ratio: 3 },
  { width: 768, height: 1024, ratio: 2 },
  { width: 810, height: 1080, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2 },
];

export default function AppleSplashScreens() {
  return (
    <>
      {DEVICES.map(({ width, height, ratio }) => {
        const pxW = width * ratio;
        const pxH = height * ratio;
        const href = `/splash/apple-splash-${pxW}-${pxH}.png`;
        const media = `screen and (device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`;

        return (
          <link
            key={href}
            rel="apple-touch-startup-image"
            href={href}
            media={media}
          />
        );
      })}
    </>
  );
}
