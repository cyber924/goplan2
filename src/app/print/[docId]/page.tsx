
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { generateStyledHtml } from '@/lib/html-generator';
import type { DocumentData } from '@/lib/html-generator';

export default function PrintPage() {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const docId = params.docId as string;
  const contentRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!docId) {
      setError("문서 ID가 없습니다.");
      setIsLoading(false);
      return;
    }

    const fetchAndRenderDocument = async () => {
      try {
        const docRef = doc(db, 'documents', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const docDataFromDb = docSnap.data();
          const fullDocumentData = {
            ...docDataFromDb.content,
            type: docDataFromDb.type,
          } as DocumentData;
          const styledHtml = await generateStyledHtml(fullDocumentData);
          setHtmlContent(styledHtml);
        } else {
          setError('문서를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error(err);
        setError('문서를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndRenderDocument();
  }, [docId]);

  useEffect(() => {
    if (!htmlContent || !contentRef.current) return;
    
    // Create and append the tooltip element
    if (!tooltipRef.current) {
        const tooltip = document.createElement("div");
        tooltip.style.position = "absolute";
        tooltip.style.padding = "6px 10px";
        tooltip.style.background = "rgba(0,0,0,0.75)";
        tooltip.style.color = "#fff";
        tooltip.style.fontSize = "12px";
        tooltip.style.borderRadius = "4px";
        tooltip.style.display = "none";
        tooltip.style.pointerEvents = "none";
        tooltip.style.zIndex = "10";
        document.body.appendChild(tooltip);
        tooltipRef.current = tooltip;
    }
    const tooltip = tooltipRef.current;

    const interactionHandlers: (() => void)[] = [];

    // 1. Accordion
    const headers = contentRef.current.querySelectorAll(".card-header");
    const accordionHandler = (e: Event) => {
        const header = e.currentTarget as HTMLElement;
        const content = header.nextElementSibling as HTMLElement;
        if (content && content.classList.contains('card-content')) {
            const isVisible = content.style.display !== "none";
            content.style.display = isVisible ? "none" : "block";
        }
    };
    headers.forEach(header => {
        header.addEventListener("click", accordionHandler);
        interactionHandlers.push(() => header.removeEventListener("click", accordionHandler));
    });

    // 2. Table Sorting
    const tableHeaders = contentRef.current.querySelectorAll("table th");
    const sortHandler = (e: Event) => {
        const th = e.currentTarget as HTMLTableCellElement;
        const table = th.closest("table");
        if (!table || th.closest('.form-table')) return;
        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll("tr"));
        const idx = th.cellIndex;
        const isAsc = !th.classList.contains("asc");
        
        table.querySelectorAll("th").forEach(otherTh => otherTh.classList.remove("asc", "desc"));
        th.classList.toggle("asc", isAsc);
th.classList.toggle("desc", !isAsc);

        rows.sort((a, b) => {
            const cellA = a.cells[idx]?.innerText.trim() || '';
            const cellB = b.cells[idx]?.innerText.trim() || '';
            
            const numA = parseFloat(cellA.replace(/[^0-9.-]+/g,""));
            const numB = parseFloat(cellB.replace(/[^0-9.-]+/g,""));

            let comparison = 0;
            if (!isNaN(numA) && !isNaN(numB)) {
                comparison = numA - numB;
            } else {
                comparison = cellA.localeCompare(cellB, undefined, {numeric: true});
            }
            
            return isAsc ? comparison : -comparison;
        });

        rows.forEach(r => tbody.appendChild(r));
    };
    tableHeaders.forEach(th => {
        th.addEventListener("click", sortHandler);
        interactionHandlers.push(() => th.removeEventListener("click", sortHandler));
    });
    
    // 3. SVG Chart Tooltip
    const bars = contentRef.current.querySelectorAll("svg .bar-group");
    const mouseMoveHandler = (e: Event) => {
        const mouseEvent = e as MouseEvent;
        if (tooltip) {
            tooltip.style.left = (mouseEvent.pageX || mouseEvent.clientX) + 15 + "px";
            tooltip.style.top = (mouseEvent.pageY || mouseEvent.clientY) + 15 + "px";
            const period = (e.currentTarget as HTMLElement).getAttribute("data-period");
            const revenue = parseFloat((e.currentTarget as HTMLElement).getAttribute("data-revenue") || '0').toLocaleString();
            tooltip.innerText = period + "\\n매출: " + revenue + " 원";
            tooltip.style.display = "block";
        }
    };
    const mouseLeaveHandler = () => {
        if(tooltip) tooltip.style.display = "none";
    };
    bars.forEach(bar => {
        bar.addEventListener("mousemove", mouseMoveHandler);
        bar.addEventListener("mouseleave", mouseLeaveHandler);
        interactionHandlers.push(() => {
            bar.removeEventListener("mousemove", mouseMoveHandler);
            bar.removeEventListener("mouseleave", mouseLeaveHandler);
        });
    });

    // Auto-print after a short delay
    const printTimeout = setTimeout(() => window.print(), 500);

    return () => {
        clearTimeout(printTimeout);
        interactionHandlers.forEach(cleanup => cleanup());
        if (tooltipRef.current && tooltipRef.current.parentNode) {
            tooltipRef.current.parentNode.removeChild(tooltipRef.current);
            tooltipRef.current = null;
        }
    };
  }, [htmlContent]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">인쇄 페이지를 준비 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-destructive text-lg">{error}</div>;
  }

  return (
    <div ref={contentRef} dangerouslySetInnerHTML={{ __html: htmlContent || '' }} />
  );
}
