document.getElementById("processBtn").addEventListener("click", processFile);
document.getElementById("uploadNewFileBtn").addEventListener("click", () => {
  document.getElementById("fileInput").click(); // Trigger file input dialog
});
document
  .getElementById("downloadPdfBtn")
  .addEventListener("click", downloadPDF);
document
  .getElementById("downloadExcelBtn")
  .addEventListener("click", downloadExcel);

function processFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (file) {
    if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      processExcel(file);
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      processWord(file);
    }
  }
}

function processExcel(file) {
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    const data = event.target.result;
    const workbook = XLSX.read(data, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const links = jsonData.flat().filter((cell) => typeof cell === "string");
    const segregatedLinks = segregateLinks(links);

    displayLinks(segregatedLinks);
    document.getElementById("buttons").style.display = "block";
    document.getElementById("uploadNewFileBtn").style.display = "block"; // Show upload button
  };
  fileReader.readAsBinaryString(file);
}

function processWord(file) {
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    mammoth
      .extractRawText({ arrayBuffer: event.target.result })
      .then((result) => {
        const text = result.value;
        const links = text.match(/(https?:\/\/[^\s]+)/g) || [];
        const segregatedLinks = segregateLinks(links);

        displayLinks(segregatedLinks);
        document.getElementById("buttons").style.display = "block";
        document.getElementById("uploadNewFileBtn").style.display = "block"; // Show upload button
      });
  };
  fileReader.readAsArrayBuffer(file);
}

function displayLinks(segregatedLinks) {
  const output = document.getElementById("output");
  let tableHtml = `
        <h2>Segregated Links</h2>
        <table>
            <thead>
                <tr>
                    <th>Platform</th>
                    <th>Username</th>
                    <th>Link</th>
                </tr>
            </thead>
            <tbody>
    `;

  for (const [platform, links] of Object.entries(segregatedLinks)) {
    links.forEach(({ url, username }) => {
      tableHtml += `
                <tr>
                    <td>${platform}</td>
                    <td>${username}</td>
                    <td><a href="${url}" target="_blank">${url}</a></td>
                </tr>
            `;
    });
  }

  tableHtml += `</tbody></table>`;
  output.innerHTML = tableHtml;
}

function segregateLinks(links) {
  const segregated = {
    Twitter: [],
    YouTube: [],
    Instagram: [],
    Facebook: []
  };

  links.forEach((link) => {
    if (link.includes("twitter.com") || link.includes("x.com")) {
      const username = extractUsername(link, "Twitter");
      segregated.Twitter.push({ url: link, username });
    } else if (link.includes("youtube.com")) {
      const username = extractUsername(link, "YouTube");
      segregated.YouTube.push({ url: link, username });
    } else if (link.includes("instagram.com")) {
      const username = extractUsername(link, "Instagram");
      segregated.Instagram.push({ url: link, username });
    } else if (link.includes("facebook.com")) {
      const username = extractUsername(link, "Facebook");
      segregated.Facebook.push({ url: link, username });
    }
  });

  return segregated;
}

function extractUsername(url, platform) {
  const urlParts = new URL(url).pathname.split("/");
  switch (platform) {
    case "Twitter":
      return urlParts[1]; // Twitter usernames are typically in the first path segment
    case "YouTube":
      return urlParts[1]; // YouTube channel IDs can vary; sometimes they are in the first path segment
    case "Instagram":
      return urlParts[1]; // Instagram usernames are in the first path segment
    case "Facebook":
      return urlParts[1]; // Facebook usernames are in the first path segment
    default:
      return "N/A";
  }
}

function downloadExcel() {
  const segregatedLinks = getSegregatedLinks();
  const wb = XLSX.utils.book_new();

  Object.entries(segregatedLinks).forEach(([platform, links]) => {
    const wsData = links.map(({ username, url }) => [username, url]);
    wsData.unshift(["Username", "Link"]); // Add header
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, platform);
  });

  XLSX.writeFile(wb, "segregated_links.xlsx");
}

function downloadPDF() {
  const pdfBlob = createPDFBlob();
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "segregated_links.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function createPDFBlob() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Add a header
  doc.setFontSize(18);
  doc.text("Segregated Links Report", 14, 20);
  doc.setFontSize(12);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);

  let y = 40;
  const lineHeight = 10;

  const segregatedLinks = getSegregatedLinks();
  Object.entries(segregatedLinks).forEach(([platform, links], index) => {
    if (index > 0) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.text(`${platform} Links`, 14, y);
    y += lineHeight;

    doc.setFontSize(12);
    links.forEach(({ username, url }) => {
      doc.text(`Username: ${username}`, 14, y);
      doc.text(`Link: ${url}`, 14, y + lineHeight);
      y += lineHeight * 2; // Extra space between entries
    });

    y += lineHeight; // Extra space before the next section
  });

  return doc.output("blob");
}

function getSegregatedLinks() {
  const outputTable = document.querySelector("#output table");
  if (!outputTable) return {};

  const rows = outputTable.querySelectorAll("tbody tr");
  const segregatedLinks = {};

  rows.forEach((row) => {
    const platform = row.querySelector("td:first-child").innerText; // Extract platform from table cell
    const username = row.querySelector("td:nth-child(2)").innerText;
    const url = row.querySelector("td:nth-child(3) a").innerText;

    if (!segregatedLinks[platform]) {
      segregatedLinks[platform] = [];
    }
    segregatedLinks[platform].push({ username, url });
  });

  return segregatedLinks;
}
