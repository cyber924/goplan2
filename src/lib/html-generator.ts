
'use server';

interface Section {
  id: string;
  title: string;
  content: string;
  chartData?: any;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date';
  value: string;
}

interface FinancialDataPoint {
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
}

export interface DocumentData {
  type: 'template' | 'market-analysis' | 'financial-visualization' | 'corporate-diagnosis' | 'business-model-canvas' | 'form' | 'interactive-report';
  title: string;
  businessIdea?: string; 
  topic?: string; 
  sections?: Section[];
  fields?: FormField[];
  content?: {
    originalData?: {
        analysisResult?: {
            chartData?: FinancialDataPoint[];
        }
    }
  };
}

const getBaseStyles = () => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=Noto+Sans+KR:wght@400;500;700&display=swap');
  #goplan-report-container { 
    font-family: 'Inter', 'Noto Sans KR', sans-serif;
    margin: 0;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    transition: background-color 0.4s ease;
  }
  #goplan-report-container .container { max-width: 900px; margin: 0 auto; padding: 2.5rem; }
  #goplan-report-container .main-title { font-size: 2.5rem; font-weight: 800; color: #1F2937; text-align: center; margin-bottom: 3rem; }
  #goplan-report-container .card { 
    border-radius: 0.75rem; 
    margin-bottom: 2rem; 
    overflow: hidden; 
    transition: transform 0.2s, box-shadow 0.2s;
  }
  #goplan-report-container .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
  }
  #goplan-report-container .card-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; cursor: pointer; user-select: none; }
  #goplan-report-container .card-header svg { width: 24px; height: 24px; }
  #goplan-report-container .card-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
  #goplan-report-container .card-content { padding: 1.5rem; line-height: 1.75; }
  #goplan-report-container img { margin-top: 1rem; margin-bottom: 1rem; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 100%; height: auto; margin-left: auto; margin-right: auto; display: block; }
  #goplan-report-container a { color: #4F46E5; text-decoration: underline; }
  #goplan-report-container table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
  #goplan-report-container th, #goplan-report-container td { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; vertical-align: top; }
  #goplan-report-container th { background-color: #f9fafb; font-weight: bold; cursor: pointer; }
  #goplan-report-container th.asc::after { content: ' ▲'; }
  #goplan-report-container th.desc::after { content: ' ▼'; }
  #goplan-report-container table tbody tr:nth-child(odd) { background-color: #f9fafb; }
  #goplan-report-container table tbody tr:hover { background-color: #eef2ff; transition: background-color 0.2s; }
  #goplan-report-container blockquote { 
    border-left: 4px solid #4F46E5; 
    background-color: #f3f4f6;
    padding: 1rem;
    margin: 1.5rem 0;
    border-radius: 0.5rem;
    font-style: italic;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  }
`;

const getFormTheme = () => `
  #goplan-report-container { background-color: white; }
  #goplan-report-container .container { padding: 2rem; }
  #goplan-report-container .main-title { font-size: 2rem; text-align: left; border-bottom: 2px solid black; padding-bottom: 1rem; margin-bottom: 2rem; }
  #goplan-report-container .form-table { width: 100%; border: 1px solid #333; }
  #goplan-report-container .form-table th, #goplan-report-container .form-table td { padding: 1rem; border: 1px solid #ddd; }
  #goplan-report-container .form-table th { width: 30%; background-color: #f9fafb; text-align: center; font-weight: bold; cursor: default; }
  #goplan-report-container .form-table td { white-space: pre-wrap; word-wrap: break-word; min-height: 40px; }
  #goplan-report-container .form-table td.empty { color: #9ca3af; }
`;

const getMarketAnalysisTheme = () => `
  #goplan-report-container { background-color: #F0F5FA; }
  #goplan-report-container .card { background-color: white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
  #goplan-report-container .card-header { background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB; color: #1F2937; }
  #goplan-report-container .card-header svg { color: #4F46E5; }
  #goplan-report-container .special-card { background-color: #EEF2FF; border: 1px solid #C7D2FE; }
  #goplan-report-container .special-card .card-header h2 { color: #4338CA; }
  #goplan-report-container h3 { font-size: 1.1rem; font-weight: bold; margin-top: 1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
`;

const getFinancialTheme = () => `
  #goplan-report-container { background-color: #f7f7f7; }
  #goplan-report-container .card { background-color: white; border: 1px solid #e5e5e5; }
  #goplan-report-container .card-header { background-color: #111827; color: white; }
  #goplan-report-container .card-header svg { color: #22D3EE; }
  #goplan-report-container .main-title { color: #111827; }
  #goplan-report-container .card-content { font-size: 0.95rem; }
  #goplan-report-container .prose { white-space: pre-wrap; }
`;

const getBmcTheme = () => `
  #goplan-report-container { background-color: #f8f8f8; }
  #goplan-report-container .card-content { font-size: 0.9rem; }
  #goplan-report-container .bmc-grid-container {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: auto auto auto;
    gap: 1rem;
    grid-template-areas:
      "partners activities proposition relationships segments"
      "partners resources proposition channels segments"
      "costs costs revenue revenue revenue";
  }
  #goplan-report-container .bmc-block { background: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; display: flex; flex-direction: column; }
  #goplan-report-container .bmc-block-title { font-weight: bold; padding: 0.75rem; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; text-align: center; }
  #goplan-report-container .bmc-block-content { padding: 1rem; flex-grow: 1; white-space: pre-wrap; font-size: 0.85rem; }
  #goplan-report-container .grid-partners { grid-area: partners; }
  #goplan-report-container .grid-activities { grid-area: activities; }
  #goplan-report-container .grid-proposition { grid-area: proposition; }
  #goplan-report-container .grid-relationships { grid-area: relationships; }
  #goplan-report-container .grid-segments { grid-area: segments; }
  #goplan-report-container .grid-resources { grid-area: resources; }
  #goplan-report-container .grid-channels { grid-area: channels; }
  #goplan-report-container .grid-costs { grid-area: costs; }
  #goplan-report-container .grid-revenue { grid-area: revenue; }
`;

const getDefaultTheme = () => `
  #goplan-report-container { background-color: white; }
  #goplan-report-container .card { border: 1px solid #E5E7EB; }
  #goplan-report-container .card-header { background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
  #goplan-report-container .card-header svg { color: #1F2937; }
`;

const getThemeStyles = (type: DocumentData['type']) => {
    switch (type) {
        case 'market-analysis':
            return getMarketAnalysisTheme();
        case 'financial-visualization':
        case 'corporate-diagnosis':
        case 'interactive-report':
            return getFinancialTheme();
        case 'business-model-canvas':
            return getBmcTheme();
        case 'form':
            return getFormTheme();
        default:
            return getDefaultTheme();
    }
};

const jsonToTable = (data: any): string => {
    if (typeof data !== 'object' || data === null) return '';
    
    let table = '<table>';
    
    if(Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
        table += '<thead><tr>';
        Object.keys(data[0]).forEach(key => {
            table += `<th>${key}</th>`;
        });
        table += '</tr></thead>';

        table += '<tbody>';
        data.forEach(row => {
            table += '<tr>';
            Object.values(row).forEach(val => {
                const value = typeof val === 'object' ? JSON.stringify(val) : val;
                table += `<td>${value}</td>`;
            });
            table += '</tr>';
        });
        table += '</tbody>';
    } else if (!Array.isArray(data)) {
         table += '<tbody>';
         for(const key in data) {
            const value = typeof data[key] === 'object' ? JSON.stringify(data[key], null, 2) : data[key];
            table += `<tr><th>${key}</th><td>${value}</td></tr>`;
         }
         table += '</tbody>';
    } else {
        return `<pre>${JSON.stringify(data, null, 2)}</pre>`
    }

    table += '</table>';
    return table;
}

const formatContent = (content: string) => {
    if (!content) return '';
    try {
        const jsonData = JSON.parse(content);
        return jsonToTable(jsonData);
    } catch (e) {
        return content
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3 border-b pb-2">$1</h2>')
            .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-4 border-b pb-2">$1</h1>')
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>');
    }
};


const renderChartSvg = (chartData: any[]): string => {
    if (!chartData || chartData.length === 0) return '';
    
    const svgWidth = 800;
    const svgHeight = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const maxRevenue = Math.max(...chartData.map(d => d.revenue || 0), 0);
    const yScale = (value: number) => height - (value / maxRevenue) * height;

    const barWidth = width / chartData.length * 0.8;
    const barGap = width / chartData.length * 0.2;

    const bars = chartData.map((d, i) => {
        const x = margin.left + i * (barWidth + barGap);
        const y = margin.top + yScale(d.revenue);
        const barHeight = height - yScale(d.revenue);
        return `
            <g class="bar-group" data-period="${d.period || d.year}" data-revenue="${d.revenue || 0}">
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#4F46E5" />
            </g>
        `;
    }).join('');

    const xLabels = chartData.map((d, i) => {
        const x = margin.left + i * (barWidth + barGap) + barWidth / 2;
        return `<text x="${x}" y="${height + margin.top + 20}" text-anchor="middle" font-size="12" fill="#666">${d.period || d.year}</text>`;
    }).join('');

    const yAxis = `
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height + margin.top}" stroke="#ccc" />
        <text x="${margin.left - 15}" y="${margin.top + 10}" text-anchor="end" font-size="12" fill="#666">${maxRevenue.toLocaleString()}</text>
        <text x="${margin.left - 15}" y="${height + margin.top}" text-anchor="end" font-size="12" fill="#666">0</text>
    `;

    return `
        <svg width="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <style>
                #goplan-report-container text { font-family: 'Inter', 'Noto Sans KR', sans-serif; }
                #goplan-report-container .bar-group { transition: opacity 0.2s; }
                #goplan-report-container .bar-group:hover { opacity: 0.8; }
            </style>
            ${yAxis}
            ${bars}
            ${xLabels}
        </svg>
    `;
};

const renderFormBody = (doc: DocumentData): string => {
    const { title, fields } = doc;
    if (!fields) return '<div>양식 필드가 없습니다.</div>';

    const fieldsHtml = fields.map(field => `
        <tr>
            <th>${field.label}</th>
            <td class="${!field.value ? 'empty' : ''}">${field.value || '(입력 없음)'}</td>
        </tr>
    `).join('');

    return `
        <div class="container">
            <h1 class="main-title">${title}</h1>
            <main>
                <table class="form-table">
                    <tbody>
                        ${fieldsHtml}
                    </tbody>
                </table>
            </main>
        </div>
    `;
};

const renderBmcBody = (doc: DocumentData): string => {
    if (!doc.sections) return '';

    const getSectionContent = (id: string) => doc.sections?.find(s => s.id === id)?.content || '';

    const validationReport = getSectionContent('validation-report');

    return `
        <div class="container">
            <h1 class="main-title">${doc.title}</h1>
            <h2>비즈니스 모델 캔버스</h2>
            <div class="bmc-grid-container">
                <div class="bmc-block grid-partners"><div class="bmc-block-title">핵심 파트너</div><div class="bmc-block-content">${formatContent(getSectionContent('keyPartners'))}</div></div>
                <div class="bmc-block grid-activities"><div class="bmc-block-title">핵심 활동</div><div class="bmc-block-content">${formatContent(getSectionContent('keyActivities'))}</div></div>
                <div class="bmc-block grid-resources"><div class="bmc-block-title">핵심 자원</div><div class="bmc-block-content">${formatContent(getSectionContent('keyResources'))}</div></div>
                <div class="bmc-block grid-proposition"><div class="bmc-block-title">가치 제안</div><div class="bmc-block-content">${formatContent(getSectionContent('valuePropositions'))}</div></div>
                <div class="bmc-block grid-relationships"><div class="bmc-block-title">고객 관계</div><div class="bmc-block-content">${formatContent(getSectionContent('customerRelationships'))}</div></div>
                <div class="bmc-block grid-channels"><div class="bmc-block-title">채널</div><div class="bmc-block-content">${formatContent(getSectionContent('channels'))}</div></div>
                <div class="bmc-block grid-segments"><div class="bmc-block-title">고객 세그먼트</div><div class="bmc-block-content">${formatContent(getSectionContent('customerSegments'))}</div></div>
                <div class="bmc-block grid-costs"><div class="bmc-block-title">비용 구조</div><div class="bmc-block-content">${formatContent(getSectionContent('costStructure'))}</div></div>
                <div class="bmc-block grid-revenue"><div class="bmc-block-title">수익원</div><div class="bmc-block-content">${formatContent(getSectionContent('revenueStreams'))}</div></div>
            </div>
            
            <div class="card" style="margin-top: 2rem;">
                <div class="card-header"><h2>AI 검증 리포트</h2></div>
                <div class="card-content"><blockquote>${formatContent(validationReport)}</blockquote></div>
            </div>
        </div>
    `;
}

export async function generateStyledHtml(doc: DocumentData): Promise<string> {
    const { type, title, businessIdea, sections } = doc;

    const themeStyles = getThemeStyles(type);
    const head = `
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            ${getBaseStyles()}
            ${themeStyles}
        </style>
    `;

    let bodyContent = '';

    if (type === 'form') {
        bodyContent = renderFormBody(doc);
    } else if (type === 'business-model-canvas') {
        bodyContent = renderBmcBody(doc);
    }
    else if (sections) {
        const sectionsHtml = sections.map(section => {
            let sectionContent = '';
            
            if (section.content === 'CHART_PLACEHOLDER') {
                const chartData = doc.type === 'interactive-report' ? section.chartData : doc.content?.originalData?.analysisResult?.chartData;
                 if (chartData) {
                    sectionContent = renderChartSvg(chartData);
                 }
            } else {
                sectionContent = `<div class="prose">${formatContent(section.content)}</div>`;
            }

            return `
                <div class="card">
                    <div class="card-header">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                        <h2>${section.title}</h2>
                    </div>
                    <div class="card-content">
                        ${sectionContent}
                    </div>
                </div>
            `;
        }).join('');

        bodyContent = `
            <div class="container">
                <h1 class="main-title">${title}</h1>
                <main>
                    ${businessIdea ? `
                    <div class="card special-card">
                        <div class="card-header">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                            <h2>핵심 사업 아이디어</h2>
                        </div>
                        <div class="card-content">
                            <blockquote>${formatContent(businessIdea)}</blockquote>
                        </div>
                    </div>
                    ` : ''}
                    ${sectionsHtml}
                </main>
            </div>
        `;
    }

    return `
        <!DOCTYPE html>
        <html lang="ko">
            <head>${head}</head>
            <body>
                <div id="goplan-report-container">
                    ${bodyContent}
                </div>
            </body>
        </html>
    `;
}
