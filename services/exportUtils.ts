export const exportElementAs = async (
  element: HTMLElement,
  filenameBase: string,
  format: 'pdf' | 'png'
) => {
  const [html2canvasMod, jspdfMod] = (await Promise.all([
    import('html2canvas'),
    import('jspdf').catch(() => ({})),
  ])) as any[];
  const html2canvas = (html2canvasMod as any)?.default || (html2canvasMod as any);
  const jsPDF = (jspdfMod as any)?.jsPDF || (jspdfMod as any)?.default;

  const EXPORT_WIDTH = 794; // A4 width at ~96dpi
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = `${EXPORT_WIDTH}px`;
  wrapper.style.background = 'white';
  wrapper.style.padding = '0';
  wrapper.style.zIndex = '-1';

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${EXPORT_WIDTH}px`;
  clone.style.maxWidth = 'none';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await (html2canvas as any)(wrapper, {
      scale: 3,
      backgroundColor: '#ffffff',
      width: EXPORT_WIDTH,
      windowWidth: EXPORT_WIDTH,
    });
  } finally {
    document.body.removeChild(wrapper);
  }
  const imgData = canvas.toDataURL('image/png');

  if (format === 'png') {
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `${filenameBase}.png`;
    link.click();
    return;
  }

  if (jsPDF) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${filenameBase}.pdf`);
  } else {
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `${filenameBase}.png`;
    link.click();
  }
};
