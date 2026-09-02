import os
import fitz  # PyMuPDF


def generate_sample_quarterly_pdf(output_path: str):
    doc = fitz.open()

    # Page 1: Earnings Press Release Header & Key Metrics
    page1 = doc.new_page()
    p1_text = """ACME TECHNOLOGY CORP. REPORTS THIRD QUARTER FISCAL 2026 RESULTS

SAN FRANCISCO, CA — October 28, 2026 — Acme Technology Corp. today announced financial results for its third quarter ended September 30, 2026.

Third Quarter FY2026 Financial Highlights:
• Total revenue was $94,930 million, an increase of 6% year-over-year compared to $89,498 million in the prior year quarter.
• Gross profit for the period was $43,879 million, representing a strong operating gross margin.
• Net income was $14,736 million for the quarter, compared to $22,956 million in the same quarter last year.
• Net cash provided by operating activities was $26,800 million for the three months ended September 30, 2026.

"We are pleased with our revenue execution across enterprise cloud and AI solutions," said the Chief Executive Officer.
"""
    page1.insert_text((50, 60), p1_text, fontsize=11)

    # Page 2: Management Discussion & Outlook
    page2 = doc.new_page()
    p2_text = """ITEM 2. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION

Forward-Looking Business Outlook & Guidance:
For the fourth fiscal quarter of 2026, the company expects total revenue between $98,000 million and $102,000 million.
Operating expenses are anticipated to be approximately $15,200 million.

Workforce & Headcount:
As of September 30, 2026, total company headcount was 164,000 full-time employees worldwide.
"""
    page2.insert_text((50, 60), p2_text, fontsize=11)

    # Page 3: Key Risk Factors
    page3 = doc.new_page()
    p3_text = """ITEM 1A. RISK FACTORS

The following important factors could cause our actual financial results to differ materially from expectations:
1. Global macroeconomic volatility and foreign exchange currency rate fluctuations could adversely affect product demand.
2. Supply chain disruptions, semiconductor component shortages, and manufacturing logistics constraints could impact delivery timelines.
3. Intensified competition in generative AI software and cloud infrastructure services could lead to price compression.
"""
    page3.insert_text((50, 60), p3_text, fontsize=11)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    doc.close()
    print(f"Sample PDF generated at: {output_path}")


if __name__ == "__main__":
    generate_sample_quarterly_pdf("eval/data/sample_q3_fy26.pdf")
