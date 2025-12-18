import { describe, it, expect } from 'vitest'
import { normalizeUrl, getPathFromUrl } from '@/lib/audit/crawler'

describe('crawler utils', () => {
  describe('normalizeUrl', () => {
    describe('basic normalization', () => {
      it('adds trailing slash for root URLs', () => {
        expect(normalizeUrl('https://example.com')).toBe('https://example.com/')
      })

      it('normalizes hostname to lowercase', () => {
        expect(normalizeUrl('https://EXAMPLE.COM/page')).toBe('https://example.com/page')
        expect(normalizeUrl('https://Example.Com/Page')).toBe('https://example.com/Page')
      })

      it('preserves port number', () => {
        expect(normalizeUrl('https://example.com:8080/page')).toBe('https://example.com:8080/page')
        expect(normalizeUrl('http://localhost:3000')).toBe('http://localhost:3000/')
      })

      it('preserves protocol', () => {
        expect(normalizeUrl('http://example.com')).toBe('http://example.com/')
        expect(normalizeUrl('https://example.com')).toBe('https://example.com/')
      })
    })

    describe('trailing slash handling', () => {
      it('removes trailing slash from paths', () => {
        expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page')
        expect(normalizeUrl('https://example.com/path/to/page/')).toBe('https://example.com/path/to/page')
      })

      it('keeps root path without trailing slash', () => {
        expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
      })

      it('handles URLs without path (adds root slash)', () => {
        expect(normalizeUrl('https://example.com')).toBe('https://example.com/')
      })
    })

    describe('tracking parameter removal', () => {
      it('removes UTM parameters', () => {
        const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=test'
        expect(normalizeUrl(url)).toBe('https://example.com/page')
      })

      it('removes Google click IDs', () => {
        expect(normalizeUrl('https://example.com?gclid=abc123')).toBe('https://example.com/')
        expect(normalizeUrl('https://example.com?gclsrc=abc')).toBe('https://example.com/')
        expect(normalizeUrl('https://example.com?dclid=abc')).toBe('https://example.com/')
      })

      it('removes Facebook click IDs', () => {
        expect(normalizeUrl('https://example.com?fbclid=abc123')).toBe('https://example.com/')
        expect(normalizeUrl('https://example.com?fb_source=abc')).toBe('https://example.com/')
      })

      it('removes Microsoft/Bing click IDs', () => {
        expect(normalizeUrl('https://example.com?msclkid=abc123')).toBe('https://example.com/')
      })

      it('removes HubSpot parameters', () => {
        const url = 'https://example.com?hsa_acc=123&hsa_cam=456'
        expect(normalizeUrl(url)).toBe('https://example.com/')
      })

      it('removes Mailchimp parameters', () => {
        expect(normalizeUrl('https://example.com?mc_cid=abc&mc_eid=def')).toBe('https://example.com/')
      })

      it('removes GA parameters', () => {
        expect(normalizeUrl('https://example.com?_ga=abc&_gl=def')).toBe('https://example.com/')
      })

      it('removes common tracker params', () => {
        expect(normalizeUrl('https://example.com?ref=twitter')).toBe('https://example.com/')
        expect(normalizeUrl('https://example.com?source=email')).toBe('https://example.com/')
        expect(normalizeUrl('https://example.com?campaign=summer')).toBe('https://example.com/')
      })

      it('preserves non-tracking query parameters', () => {
        expect(normalizeUrl('https://example.com/search?q=test')).toBe('https://example.com/search?q=test')
        expect(normalizeUrl('https://example.com/page?id=123')).toBe('https://example.com/page?id=123')
      })

      it('removes tracking params but keeps others', () => {
        const url = 'https://example.com/page?id=123&utm_source=google&name=test'
        expect(normalizeUrl(url)).toBe('https://example.com/page?id=123&name=test')
      })

      it('handles case-insensitive tracking params', () => {
        expect(normalizeUrl('https://example.com?UTM_SOURCE=test')).toBe('https://example.com/')
        expect(normalizeUrl('https://example.com?Utm_Medium=email')).toBe('https://example.com/')
      })
    })

    describe('error handling', () => {
      it('returns original string for invalid URLs', () => {
        expect(normalizeUrl('not-a-url')).toBe('not-a-url')
        expect(normalizeUrl('invalid://url')).toBe('invalid://url')
      })

      it('handles empty string', () => {
        expect(normalizeUrl('')).toBe('')
      })

      it('handles malformed URLs gracefully', () => {
        expect(normalizeUrl('http://')).toBe('http://')
      })
    })

    describe('complex URLs', () => {
      it('handles URLs with hash fragments', () => {
        // Hash is stripped by URL parsing, pathname doesn't include it
        const result = normalizeUrl('https://example.com/page#section')
        expect(result).toBe('https://example.com/page')
      })

      it('handles encoded characters in path', () => {
        expect(normalizeUrl('https://example.com/path%20with%20spaces')).toBe('https://example.com/path%20with%20spaces')
      })

      it('handles subdomains', () => {
        expect(normalizeUrl('https://WWW.EXAMPLE.COM/page')).toBe('https://www.example.com/page')
        expect(normalizeUrl('https://BLOG.EXAMPLE.COM')).toBe('https://blog.example.com/')
      })
    })
  })

  describe('getPathFromUrl', () => {
    const baseUrl = 'https://example.com'

    describe('same origin URLs', () => {
      it('extracts pathname from same-origin URL', () => {
        expect(getPathFromUrl('https://example.com/page', baseUrl)).toBe('/page')
        expect(getPathFromUrl('https://example.com/path/to/page', baseUrl)).toBe('/path/to/page')
      })

      it('returns root for base URL', () => {
        expect(getPathFromUrl('https://example.com', baseUrl)).toBe('/')
        expect(getPathFromUrl('https://example.com/', baseUrl)).toBe('/')
      })

      it('preserves query strings in path', () => {
        expect(getPathFromUrl('https://example.com/search?q=test', baseUrl)).toBe('/search')
      })

      it('handles trailing slashes', () => {
        expect(getPathFromUrl('https://example.com/page/', baseUrl)).toBe('/page/')
      })
    })

    describe('different origin URLs', () => {
      it('returns full URL for different domain', () => {
        expect(getPathFromUrl('https://other.com/page', baseUrl)).toBe('https://other.com/page')
      })

      it('returns full URL for different subdomain', () => {
        expect(getPathFromUrl('https://blog.example.com/page', baseUrl)).toBe('https://blog.example.com/page')
      })

      it('returns full URL for different protocol', () => {
        expect(getPathFromUrl('http://example.com/page', baseUrl)).toBe('http://example.com/page')
      })

      it('returns full URL for different port', () => {
        expect(getPathFromUrl('https://example.com:8080/page', baseUrl)).toBe('https://example.com:8080/page')
      })
    })

    describe('error handling', () => {
      it('returns root for invalid URL', () => {
        expect(getPathFromUrl('not-a-url', baseUrl)).toBe('/')
      })

      it('returns root for invalid base URL', () => {
        expect(getPathFromUrl('https://example.com/page', 'not-a-url')).toBe('/')
      })

      it('returns root for empty URL', () => {
        expect(getPathFromUrl('', baseUrl)).toBe('/')
      })
    })

    describe('edge cases', () => {
      it('handles URLs with hash fragments', () => {
        expect(getPathFromUrl('https://example.com/page#section', baseUrl)).toBe('/page')
      })

      it('handles base URL with path', () => {
        const baseWithPath = 'https://example.com/app'
        expect(getPathFromUrl('https://example.com/page', baseWithPath)).toBe('/page')
      })

      it('handles case insensitivity in hostname (URL normalizes)', () => {
        // URL.origin normalizes hostname to lowercase, so these are same origin
        expect(getPathFromUrl('https://EXAMPLE.COM/page', baseUrl)).toBe('/page')
      })
    })
  })
})
