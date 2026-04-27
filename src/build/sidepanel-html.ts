export function createSidepanelHtml(source: string) {
  const withScript = source.replace("./main.tsx", "./assets/sidepanel.js");

  if (withScript.includes('href="./assets/sidepanel.css"')) {
    return withScript;
  }

  return withScript.replace(
    "  </head>",
    '    <link rel="stylesheet" href="./assets/sidepanel.css" />\n  </head>'
  );
}
