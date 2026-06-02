const fs = require("fs");
const path = require("path");

const htmlPath = "analysis-select.html";
const cssPath = "analysis-select.css";

const wagonSource = "C:\\Users\\darji\\Desktop\\Cricket Wagon Wheel Project\\Wagonw.png";
const pitchSource = "C:\\Users\\darji\\Desktop\\Cricket Wagon Wheel Project\\pitch.png";

const assetsDir = "assets";

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

fs.copyFileSync(wagonSource, path.join(assetsDir, "analysis-wagon-wheel.png"));
fs.copyFileSync(pitchSource, path.join(assetsDir, "analysis-pitch-map.png"));

let html = fs.readFileSync(htmlPath, "utf8");

html = html.replace(
/\s*<div class="mini-ground" aria-hidden="true">[\s\S]*?<\/div>\s*<\/a>/,
`
            <img class="analysis-preview-image wagon-preview-image" src="assets/analysis-wagon-wheel.png" alt="Wagon wheel preview" />
          </a>`
);

html = html.replace(
/\s*<div class="mini-pitch-map" aria-hidden="true">[\s\S]*?<\/div>\s*<\/a>/,
`
            <img class="analysis-preview-image pitch-preview-image" src="assets/analysis-pitch-map.png" alt="Pitch map preview" />
          </a>`
);

fs.writeFileSync(htmlPath, html);

let css = fs.readFileSync(cssPath, "utf8");

css += `
.analysis-preview-image {
  display: block !important;
  justify-self: center !important;
  align-self: center !important;
  object-fit: contain !important;
  user-select: none !important;
  pointer-events: none !important;
}

.wagon-preview-image {
  width: 185px !important;
  height: 185px !important;
}

.pitch-preview-image {
  width: 145px !important;
  height: 195px !important;
}

.mini-ground,
.mini-pitch-map {
  display: none !important;
}

@media (max-width: 820px) {
  .wagon-preview-image {
    width: 150px !important;
    height: 150px !important;
  }

  .pitch-preview-image {
    width: 120px !important;
    height: 165px !important;
  }
}

@media (max-width: 540px) {
  .analysis-preview-image {
    display: none !important;
  }
}
`;

fs.writeFileSync(cssPath, css);

console.log("Analysis select page now uses Wagonw.png and pitch.png.");
