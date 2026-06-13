import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

export function exportCSV(absa = []) {
  if (!absa.length) return toast.error('No data to export')
  const rows = absa.map(r => ({
    text:        (r.text || '').slice(0, 120),
    rating:      r.rating ?? '',
    category:    r.category ?? '',
    language:    r.language ?? '',
    sentiment:   r.overall_sentiment?.label ?? '',
    score:       r.overall_sentiment?.score ?? '',
    emotion:     r.emotion ?? '',
    aspects:     Object.keys(r.aspects || {}).join('; '),
    is_spam:     r.is_spam ? 'yes' : 'no',
    is_sarcasm:  r.is_sarcasm ? 'yes' : 'no',
    impact:      r.impact ?? '',
  }))
  const header = Object.keys(rows[0]).join(',')
  const body   = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob   = new Blob([`${header}\n${body}`], { type: 'text/csv' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href = url; a.download = 'review_insights.csv'; a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV exported!')
}

export function exportPDF(result = {}) {
  if (!result.total_reviews) return toast.error('No analysis data to export')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(5, 5, 16)
  doc.rect(0, 0, 210, 297, 'F')
  doc.setTextColor(0, 255, 136)
  doc.setFontSize(22)
  doc.text('ReviewIntel Report', 15, 22)
  doc.setFontSize(10)
  doc.setTextColor(160, 160, 192)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 30)

  // Stats summary
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text('Analysis Summary', 15, 44)
  autoTable(doc, {
    startY: 48,
    styles: { fillColor: [10, 10, 30], textColor: [240, 240, 255], fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [0, 50, 30], textColor: [0, 255, 136] },
    head: [['Metric', 'Value']],
    body: [
      ['Total Reviews',   result.total_reviews ?? '-'],
      ['Cleaned Reviews', result.cleaned_reviews ?? '-'],
      ['Spam Flagged',    result.spam_flagged ?? '-'],
      ['Sarcasm Flagged', result.sarcasm_flagged ?? '-'],
    ],
  })

  // Trends
  if (result.trends?.length) {
    const yStart = doc.lastAutoTable.finalY + 10
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.text('Top Trends', 15, yStart)
    autoTable(doc, {
      startY: yStart + 4,
      styles: { fillColor: [10, 10, 30], textColor: [240, 240, 255], fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [20, 0, 50], textColor: [0, 212, 255] },
      head: [['Feature', 'Category', 'Change %', 'Direction', 'Volume']],
      body: result.trends.slice(0, 8).map(t => [
        t.feature, t.category, `${t.change_pct > 0 ? '+' : ''}${t.change_pct}%`, t.direction, t.volume,
      ]),
    })
  }

  // Top ABSA
  if (result.absa?.length) {
    const yStart = doc.lastAutoTable?.finalY + 10 || 120
    if (yStart < 250) {
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.text('Sample Review Insights (top 10)', 15, yStart)
      autoTable(doc, {
        startY: yStart + 4,
        styles: { fillColor: [10, 10, 30], textColor: [220, 220, 255], fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [30, 0, 30], textColor: [255, 0, 255] },
        head: [['Review (truncated)', 'Sentiment', 'Emotion', 'Aspects']],
        body: result.absa.slice(0, 10).map(r => [
          (r.text || '').slice(0, 60) + '…',
          r.overall_sentiment?.label ?? '-',
          r.emotion ?? '-',
          Object.keys(r.aspects || {}).slice(0, 3).join(', ') || '-',
        ]),
      })
    }
  }

  // AI Recommendations
  if (result.recommendations) {
    doc.addPage()
    doc.setFillColor(5, 5, 16)
    doc.rect(0, 0, 210, 297, 'F')
    doc.setTextColor(0, 255, 136)
    doc.setFontSize(14)
    doc.text('AI Recommendations', 15, 20)
    doc.setTextColor(200, 200, 220)
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(result.recommendations, 180)
    doc.text(lines, 15, 30)
  }

  doc.save('reviewintel_report.pdf')
  toast.success('PDF exported!')
}
