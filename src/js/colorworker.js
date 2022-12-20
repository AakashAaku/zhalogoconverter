/**
 * SVGcode—Convert raster images to SVG vector graphics
 * Copyright (C) 2021 Google LLC
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { potrace, init } from 'esm-potrace-wasm';

const extractColors = (imageData) => {
  const colors = {};
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    if (a === 0) {
      continue;
    }
    const rgba = `${r},${g},${b},${a}`;
    if (!colors[rgba]) {
      colors[rgba] = [i];
    } else {
      colors[rgba].push(i);
    }
  }
  return colors;
};

const convertToColorSVG = async (imageData, params, progressPort) => {
  await init();
  const colors = extractColors(imageData);

  let prefix = '';
  let suffix = '';
  let svgString = '';

  const promises = [];
  let processed = 0;
  for (const [color, occurrences] of Object.entries(colors)) {
    promises.push(() => {
      let newImageData = new ImageData(imageData.width, imageData.height);
      newImageData.data.fill(255);
      const len = occurrences.length;
      for (let i = 0; i < len; i++) {
        const location = occurrences[i];
        newImageData.data[location] = 0;
        newImageData.data[location + 1] = 0;
        newImageData.data[location + 2] = 0;
        newImageData.data[location + 3] = 255;
      }
      return new Promise(async (resolve) => {
        let svg = await potrace(newImageData, params);
        newImageData = null;
        const [r, g, b, a] = color.split(',');
        const alpha = (a / 255).toFixed(2);
        svg = svg.replace(
          'fill="#000000" stroke="none"',
          `fill="rgb(${r},${g},${b})" stroke="rgb(${r},${g},${b})"${
            a === '255'
              ? ''
              : ` fill-opacity="${alpha}" stroke-opacity="${alpha}"`
          } stroke-width="${params.strokeWidth}px"`,
        );
        const pathRegEx = /<path\s*d="([^"]+)"\/>/g;
        let matches;
        const shortPaths = [];
        while ((matches = pathRegEx.exec(svg)) !== null) {
          const path = matches[1];
          if (path.split(' ').length < params.minPathSegments) {
            shortPaths.push(matches[0]);
          }
        }
        shortPaths.forEach((path) => {
          svg = svg.replace(path, '');
        });
        processed++;
        if (!/<path/.test(svg)) {
          if (total === processed) {
            console.log(`Potraced 100% %c■■`, `color: rgba(${color})`);
          }
          progressPort.postMessage({ processed, total });
          resolve('');
          return;
        }
        console.log(
          `Potraced ${String(((processed / total) * 100).toFixed())}% %c■■`,
          `color: rgba(${color})`,
        );
        progressPort.postMessage({ processed, total, svg });
        resolve(svg);
      });
    });
  }

  const total = promises.length;
  const promiseChunks = [];
  const chunkSize = 2 * navigator.hardwareConcurrency || 16;
  while (promises.length > 0) {
    promiseChunks.push(promises.splice(0, chunkSize));
  }
  const svgs = [];
  for (const chunk of promiseChunks) {
    svgs.push(await Promise.all(chunk.map((f) => f())));
  }

  for (const svg of svgs.flat()) {
    if (!prefix) {
      prefix = svg.replace(/(.*?<svg[^>]+>)(.*?)(<\/svg>)/, '$1');
      suffix = svg.replace(/(.*?<svg[^>]+>)(.*?)(<\/svg>)/, '$3');
      svgString = prefix;
    }
    svgString += svg.replace(/(.*?<svg[^>]+>)(.*?)(<\/svg>)/, '$2');
  }
  svgString += suffix;
  return svgString;
};

self.addEventListener('message', async (e) => {
  const { imageData, params } = e.data;
  const svg = await convertToColorSVG(imageData, params, e.ports[1]);
  e.ports[0].postMessage({ result: svg });
});
