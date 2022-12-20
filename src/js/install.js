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

import { installButton } from './domrefs.js';

let installEvent = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installEvent = event;
  installButton.style.display = 'flex';
});

installButton.addEventListener('click', async () => {
  if (!installEvent) {
    return;
  }
  installEvent.prompt();
  const result = await installEvent.userChoice;
  if (result.outcome === 'accepted') {
    installButton.style.display = 'none';
    installEvent = null;
  }
});

window.addEventListener('appinstalled', (event) => {
  // Duplicate because users can install through the prompt or the button.
  installButton.style.display = 'none';
  installEvent = null;
});
