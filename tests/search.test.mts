/**
 * Arama yardımcılarının birim testleri.
 * Çalıştırma: node --experimental-strip-types tests/search.test.mts
 */
import assert from 'node:assert/strict'
import { composeSearchText, fold, highlight, matchesTokens, searchText, tokenize } from '../src/search.ts'

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

test('Tırnak içindeki ifade tek terim olarak korunur', () => {
  const tokens = tokenize('"toraks travması" kot')
  assert.deepEqual(tokens, ['toraks travmasi', 'kot'])
  assert.equal(matchesTokens('toraks ve travma sonrasi kot frakturu', tokens), false)
  assert.equal(matchesTokens('toraks travmasi sonrasi kot frakturu', tokens), true)
})

test('Eşleşen aralıklar kaynak metinde işaretlenir', () => {
  const segments = highlight('Göğüs Cerrahisi', tokenize('gogus'))
  assert.deepEqual(segments, [
    { text: 'Göğüs', match: true },
    { text: ' Cerrahisi', match: false },
  ])
})

test('Vurgulama Türkçe büyük harf ve aksanla da çalışır', () => {
  const segments = highlight('İZMİR Göğüs Hastanesi', tokenize('izmir gogus'))
  assert.equal(segments.filter((s) => s.match).map((s) => s.text).join('|'), 'İZMİR|Göğüs')
})

test('Eşleşme yoksa metin tek parça döner', () => {
  assert.deepEqual(highlight('Akciğer', tokenize('ozofagus')), [{ text: 'Akciğer', match: false }])
  assert.deepEqual(highlight('', tokenize('x')), [])
})

test('Kart arama metni katlanır, Türkçe harf araması eşleşir', () => {
  const metin = composeSearchText(['Göğüs duvarı tümöründe rezeksiyon', 'Göğüs duvarı',
    'Annals of Thoracic Surgery', 'Retrospektif kohort', '42 hasta'])
  assert.equal(metin.includes('gogus'), true)
  assert.equal(metin.includes('göğüs'), false)
  assert.equal(matchesTokens(metin, tokenize('gogus')), true)
  assert.equal(matchesTokens(metin, tokenize('GÖĞÜS rezeksiyon')), true)
  assert.equal(matchesTokens(metin, tokenize('ozofagus')), false)
})
console.log(`\n${passed} test geçti`)
