(function () {
  const exportButton = document.getElementById('exportIcaoFplBtn');
  if (!exportButton) return;

  const TEMPLATE_URL = './assets/pdf/FPL_FORM_AFAC.PDF';
  const ROUTE_FIELDS = ['RU 1', 'RU 2', 'RU 3', 'RU 4', 'RU 5'];
  const ROUTE_LINE_LENGTHS = [47, 73, 73, 73, 62];

  function readValue(id) {
    return String(document.getElementById(id)?.value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  function fillCharacters(form, fieldNames, value) {
    const characters = String(value || '').padEnd(fieldNames.length, ' ').slice(0, fieldNames.length);
    fieldNames.forEach((fieldName, index) => {
      form.getTextField(fieldName).setText(characters[index].trim());
    });
  }

  function splitRoute(route) {
    const words = String(route || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let currentLine = '';
    let lineIndex = 0;

    words.forEach((word) => {
      const limit = ROUTE_LINE_LENGTHS[Math.min(lineIndex, ROUTE_LINE_LENGTHS.length - 1)];
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= limit || !currentLine) {
        currentLine = candidate;
        return;
      }
      lines.push(currentLine);
      lineIndex += 1;
      currentLine = word;
    });

    if (currentLine) lines.push(currentLine);
    return lines.slice(0, ROUTE_FIELDS.length);
  }

  function fillRoute(form, route) {
    const lines = splitRoute(route);
    ROUTE_FIELDS.forEach((fieldName, index) => {
      form.getTextField(fieldName).setText(lines[index] || '');
    });
  }

  function fillWrappedText(form, fieldNames, value, lineLengths) {
    const words = String(value || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      const lineIndex = Math.min(lines.length, lineLengths.length - 1);
      const limit = lineLengths[lineIndex];
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= limit || !currentLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);

    fieldNames.forEach((fieldName, index) => {
      form.getTextField(fieldName).setText(lines[index] || '');
    });
  }

  function previewPdf(bytes, filename, previewWindow) {
    const blob = new File([bytes], filename, { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    previewWindow.location.replace(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  }

  function getUtcDate() {
    const now = new Date();
    const day = String(now.getUTCDate()).padStart(2, '0');
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const year = String(now.getUTCFullYear());
    return `${day}${month}${year}`;
  }

  async function exportOfficialFpl() {
    const data = {
      dep: readValue('depAd'),
      dest: readValue('destAd'),
      etd: readValue('etd'),
      route: readValue('fixes'),
      aircraftId: readValue('aircraftId'),
      flightRules: readValue('flightRules'),
      flightType: readValue('flightType'),
      aircraftNumber: readValue('aircraftNumber'),
      aircraftType: readValue('aircraftType'),
      wakeCategory: readValue('wakeCategory'),
      equipment: readValue('equipment'),
      cruisingSpeed: readValue('cruisingSpeed'),
      cruisingLevel: readValue('cruisingLevel'),
      totalEet: readValue('totalEet'),
      alternate1: readValue('alternate1'),
      alternate2: readValue('alternate2'),
      otherInformation: readValue('otherInformation'),
      endurance: readValue('endurance'),
      personsOnBoard: readValue('personsOnBoard'),
      aircraftColour: readValue('aircraftColour'),
      remarks: readValue('fplRemarks'),
      pilotInCommand: readValue('pilotInCommand')
    };

    if (!data.dep || !data.dest || !data.route) {
      window.alert('Enter DEP, DEST and Route before exporting the official FPL form.');
      return;
    }

    if (!window.PDFLib) {
      window.alert('The PDF component could not be loaded. Refresh AeroTrack and try again.');
      return;
    }

    // Open synchronously so mobile browsers do not treat the preview as a blocked pop-up.
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      window.alert('The PDF preview was blocked. Allow pop-ups for this site and try again.');
      return;
    }
    previewWindow.opener = null;
    previewWindow.document.write('<!doctype html><title>Generating FPL preview</title><p style="font:16px Arial;padding:24px">Generating official FPL preview...</p>');
    previewWindow.document.close();

    exportButton.disabled = true;
    const originalLabel = exportButton.textContent;
    exportButton.textContent = 'Generating PDF...';

    try {
      const response = await fetch(TEMPLATE_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Template request failed: ${response.status}`);

      const templateBytes = await response.arrayBuffer();
      const pdfDocument = await PDFLib.PDFDocument.load(templateBytes);
      const form = pdfDocument.getForm();
      const font = await pdfDocument.embedFont(PDFLib.StandardFonts.Helvetica);

      fillCharacters(form, ['ID 1', 'ID 2', 'ID 3', 'ID4', 'ID 4', 'ID 5', 'ID 6'], data.aircraftId);
      form.getTextField('REG 1').setText(data.flightRules);
      form.getTextField('TIP 1').setText(data.flightType);
      fillCharacters(form, ['undefined.NUMERO1', 'undefined.NUMERO2'], data.aircraftNumber);
      fillCharacters(form, ['AE 1', 'AE 2', 'AE 3', 'AE 4'], data.aircraftType);
      form.getTextField('TE 1').setText(data.wakeCategory);
      form.getTextField('RAD 1').setText(data.equipment);
      fillCharacters(form, ['AS 1', 'AS 2', 'AS 3', 'AS 4'], data.dep);
      fillCharacters(form, ['HS 1', 'HS 2', 'HS 3', 'HS 4'], data.etd);
      fillCharacters(form, ['VC 1', 'VC 2', 'VC 3', 'VC 4', 'VC 5'], data.cruisingSpeed);
      fillCharacters(form, ['NI 1', 'NI 2', 'NI 3', 'NI 4', 'NI 5'], data.cruisingLevel);
      fillCharacters(form, ['AD 1', 'AD 2', 'AD 3', 'AD 4'], data.dest);
      fillCharacters(form, ['EE 1', 'EE 2', 'EE 3', 'EE 4'], data.totalEet);
      fillCharacters(form, ['AP 1', 'AP 2', 'AP 3', 'AP 4'], data.alternate1);
      fillCharacters(form, ['AA 1', 'AA 2', 'AA 3', 'AA 4'], data.alternate2);
      // The first date cell has an inherited malformed parent name in the source PDF.
      fillCharacters(form, ['undefined.FECHA1', 'FECHA2', 'FECHA3', 'FECHA4', 'FECHA5', 'FECHA6', 'FECHA7', 'FECHA8'], getUtcDate());
      fillRoute(form, data.route);
      fillWrappedText(form, ['DATOS 1', 'DATOS 2', 'DATOS 3', 'undefined.DATOS 4', 'undefined.DATOS 5'], data.otherInformation, [70, 74, 74, 74, 64]);
      fillCharacters(form, ['AU 1', 'AU 2', 'AU 3', 'AU 4'], data.endurance);
      fillCharacters(form, ['PR 1', 'PR 2', 'PR 3'], data.personsOnBoard);
      form.getTextField('CM 1').setText(data.aircraftColour);
      form.getTextField('OBS 1').setText(data.remarks);
      form.getTextField('PI 1').setText(data.pilotInCommand);
      form.updateFieldAppearances(font);

      const pdfBytes = await pdfDocument.save();
      const filename = `FPL_${data.dep}_${data.dest}_${getUtcDate()}.pdf`;
      previewPdf(pdfBytes, filename, previewWindow);
    } catch (error) {
      console.error('Unable to generate the official FPL PDF:', error);
      previewWindow.close();
      window.alert('The official FPL PDF could not be generated. Please try again.');
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = originalLabel;
    }
  }

  exportButton.addEventListener('click', exportOfficialFpl);
})();
