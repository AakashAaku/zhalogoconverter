import{d as a,m as e,a as s}from"./index.d680fb91.js";const o="window-controls-overlay",n=()=>{e.classList.toggle(o,navigator.windowControlsOverlay.visible),s.classList.toggle(o,navigator.windowControlsOverlay.visible)};navigator.windowControlsOverlay.addEventListener("geometrychange",a(async()=>{n()},250));n();
