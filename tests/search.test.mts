/**
 * Arama yardımcılarının birim testleri.
 * Çalıştırma: node --experimental-strip-types tests/search.test.mts
 */
import assert from 'node:assert/strict'
import { fold, matchesTokens, searchText, tokenize } from '../src/search.ts'

let passed = 0
const test = (name: string, fn: () => void) => {
  fn()
  passed += 1
  console.log('ok -', name)
}

test('Türkçe büyük I ve noktalı İ aynı harfe iner', () => {
  assert.equal(fold('İZMİR'), 'izmir')
  assert.equal(fold('ISPARTA'), 'isparta')
  assert.equal(fold('izmir'), 'izmir')
})

test('Aksanlar sadeleşir, arama aksansız da bulur', () => {
  assert.equal(fold('Göğüs Cerrahisi'), 'gogus cerrahisi')
  assert.equal(fold('Tüberküloz'), 'tuberkuloz')
  assert.equal(fold('Özofagus'), 'ozofagus')
})

test('Sorgu boşlukla terimlere bölünür, VE mantığı uygulanır', () => {
  const tokens = tokenize('  Gogus   tümör ')
  assert.deepEqual(tokens, ['gogus', 'tumor'])
  assert.equal(matchesTokens('gogus cerrahisi tumor rezeksiyonu', tokens), true)
  assert.equal(matchesTokens('gogus cerrahisi rezeksiyon', tokens), false)
})

test('Boş sorgu her kaydı eşler', () => {
  assert.deepEqual(tokenize('   '), [])
  assert.equal(matchesTokens('herhangi bir metin', tokenize('')), true)
})

test('Kayıt metni nesne başına bir kez hesaplanır', () => {
  const record = { title: 'Test' }
  const first = searchText(record, ['Göğüs', ['a', 'b']])
  const second = searchText(record, ['tamamen farklı metin'])
  assert.equal(first, 'gogus a b')
  assert.equal(second, first)
})

test('Tanımsız ve boş alanlar metne karışmaz', () => {
  const record = {}
  assert.equal(searchText(record, [undefined, null, '', [], 'Akciğer']), 'akciger')
})

console.log(`\n${passed} test geçti`)
