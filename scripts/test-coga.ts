/**
 * Script de teste para regras COGA
 *
 * Uso: npx tsx scripts/test-coga.ts
 */

import { chromium } from 'playwright'
import { getCogaViolations } from '../src/lib/audit/coga-rules'

async function main() {
  const url = process.argv[2] || 'http://localhost:55947'

  console.log(`\n🔍 Testando regras COGA em: ${url}\n`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    console.log('⏳ Carregando página...')
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000) // Dar tempo para renderizar

    // Injetar helpers DEPOIS da navegação (o goto limpa o contexto)
    console.log('💉 Injetando helpers (getSelector, getXPath)...')
    await page.evaluate(`
      window.getSelector = (el) => {
        if (el.id) return '#' + el.id;
        const path = [];
        let current = el;
        while (current && current.tagName !== 'HTML') {
          let selector = current.tagName.toLowerCase();
          if (current.id) {
            selector = '#' + current.id;
            path.unshift(selector);
            break;
          }
          if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\\s+/).slice(0, 2).join('.');
            if (classes) selector += '.' + classes;
          }
          const parentEl = current.parentElement;
          if (parentEl) {
            const currentTag = current.tagName;
            const siblings = Array.from(parentEl.children).filter(c => c.tagName === currentTag);
            if (siblings.length > 1) {
              const index = siblings.indexOf(current) + 1;
              selector += ':nth-of-type(' + index + ')';
            }
          }
          path.unshift(selector);
          current = parentEl;
        }
        return path.join(' > ');
      };

      window.getXPath = (el) => {
        const parts = [];
        let current = el;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let index = 1;
          let prevSibling = current.previousElementSibling;
          while (prevSibling) {
            if (prevSibling.tagName === current.tagName) index++;
            prevSibling = prevSibling.previousElementSibling;
          }
          const tagName = current.tagName.toLowerCase();
          let hasMultipleSiblings = false;
          let checkSibling = current.parentElement?.firstElementChild || null;
          while (checkSibling) {
            if (checkSibling !== current && checkSibling.tagName === current.tagName) {
              hasMultipleSiblings = true;
              break;
            }
            checkSibling = checkSibling.nextElementSibling;
          }
          const part = hasMultipleSiblings ? tagName + '[' + index + ']' : tagName;
          parts.unshift(part);
          current = current.parentElement;
        }
        return '/' + parts.join('/');
      };
      console.log('Helpers injetados!');
    `)

    console.log('🔎 Executando regras COGA...\n')
    const violations = await getCogaViolations(page)

    if (violations.length === 0) {
      console.log('✅ Nenhuma violação COGA encontrada!')
    } else {
      console.log(`⚠️  ${violations.length} violações COGA encontradas:\n`)

      // Agrupar por regra
      const byRule = new Map<string, typeof violations>()
      for (const v of violations) {
        if (!byRule.has(v.ruleId)) {
          byRule.set(v.ruleId, [])
        }
        byRule.get(v.ruleId)!.push(v)
      }

      for (const [ruleId, ruleViolations] of byRule) {
        console.log(`\n📌 ${ruleId} (${ruleViolations.length}x)`)
        console.log(`   ${ruleViolations[0].help}`)
        for (const v of ruleViolations.slice(0, 3)) {
          console.log(`   - ${v.failureSummary?.substring(0, 80)}...`)
        }
        if (ruleViolations.length > 3) {
          console.log(`   ... e mais ${ruleViolations.length - 3}`)
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await browser.close()
  }

  console.log('\n')
}

main()
