import test from 'node:test';
import assert from 'node:assert/strict';

let appId = 0;

async function withApp(run) {
  // Exercise main.js event delegation without installing a DOM or browser package.
  const globals = ['document', 'window', 'HTMLInputElement'];
  const previous = globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const listeners = {};
  const windowListeners = {};
  let controls = [];
  let markup = '';
  let renders = 0;
  const doc = { activeElement: null, getElementById: (id) => controls.find((element) => element.id === id) };
  class Input {
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  }
  const app = {
    addEventListener: (type, listener) => { listeners[type] = listener; },
    querySelectorAll: () => controls.filter((element) => element.dataset.action),
    set innerHTML(value) {
      markup = value;
      renders += 1;
      doc.activeElement = null;
      controls = [...value.matchAll(/<(button|a|input)\b([^>]*)>/g)].map(([, tag, attrs]) => {
        const attribute = (name) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1];
        const element = Object.assign(tag === 'input' ? new Input() : {}, {
          dataset: { action: attribute('data-action'), id: attribute('data-id') },
          id: attribute('id'), type: attribute('type') || 'text', value: attribute('value') || '',
          checked: /\schecked(?:\s|$)/.test(attrs),
          getAttribute: attribute,
          matches: (selector) => selector === 'input[data-action]'
            ? tag === 'input' && !!attribute('data-action')
            : tag === 'input' || (tag === 'button' && attribute('type') === 'submit'),
          closest: () => element,
          focus: () => { doc.activeElement = element; },
        });
        if (tag === 'input') element.setSelectionRange(element.value.length, element.value.length);
        return element;
      });
    },
  };
  doc.querySelector = () => app;
  const win = {
    location: { hash: '#/catalog' },
    addEventListener: (type, listener) => { windowListeners[type] = listener; },
    scrollTo() {},
  };
  function control(action, id) {
    const element = controls.find((element) => element.dataset.action === action && element.dataset.id === id);
    assert.ok(element, `${action}: ${id ?? ''}`);
    return element;
  }
  function click(action, id) {
    const target = control(action, id);
    target.focus();
    listeners.click({ target, preventDefault() {} });
  }
  Object.assign(globalThis, { document: doc, window: win, HTMLInputElement: Input });
  try {
    await import(`../src/main.js?input-regression-${++appId}`);
    await run({
      control, click, doc,
      get markup() { return markup; },
      get renders() { return renders; },
      preset(id) {
        win.location.hash = control('catalog', id).getAttribute('href');
        click('catalog', id);
      },
      emit(type, target, properties = {}) {
        assert.equal(typeof listeners[type], 'function', `${type} listener`);
        listeners[type]({ target, ...properties });
      },
      navigate(hash) { win.location.hash = hash; windowListeners.hashchange(); },
    });
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('검색·코드 입력은 compositionstart부터 DOM을 유지하고 compositionend에서 최종 값을 반영한다', async () => {
  for (const [preset, action] of [['4-1', 'query'], ['1-7', 'code-input']]) {
    await withApp((app) => {
      app.preset(preset);
      const input = app.control(action);
      input.focus();
      const renders = app.renders;
      const before = app.markup;
      app.emit('compositionstart', input);
      for (const [value, flags] of [['ㅎ', { isComposing: true }], ['하', { isComposing: false }], ['한', {}]]) {
        input.value = value;
        app.emit('input', input, flags);
        assert.equal(app.renders, renders);
        assert.equal(app.markup, before);
        assert.equal(app.control(action), input);
        assert.equal(app.doc.activeElement, input);
      }
      input.value = '한글';
      app.emit('compositionend', input);
      assert.equal(app.renders, renders + 1);
      assert.equal(app.control(action).value, '한글');
      assert.equal(app.doc.activeElement, app.control(action));
      // A subsequent noncomposing input continues to work after the composition ends.
      const next = app.control(action);
      next.value = '한글 입력';
      app.emit('input', next, { isComposing: false });
      assert.equal(app.renders, renders + 2);
      assert.equal(app.control(action).value, '한글 입력');
    });
  }
});

test('compositionstart를 받지 않아도 isComposing 입력은 렌더하지 않고 조합 종료 때 반영한다', async () => {
  await withApp((app) => {
    app.preset('4-1');
    const input = app.control('query');
    const renders = app.renders;
    input.value = '성';
    app.emit('input', input, { isComposing: true });
    assert.equal(app.renders, renders);
    assert.equal(app.control('query'), input);
    input.value = '성수';
    app.emit('compositionend', input);
    assert.equal(app.control('query').value, '성수');
    assert.match(app.markup, /예시 카페/);
    assert.doesNotMatch(app.markup, /예시 국밥집/);
  });
});

test('일반 입력은 즉시 검색하고 체크박스는 장소 ID로 선택·해제한다', async () => {
  await withApp((app) => {
    app.preset('4-4');
    const input = app.control('query');
    const renders = app.renders;
    input.value = '성수';
    app.emit('input', input);
    assert.equal(app.renders, renders + 1);
    assert.equal(app.control('query').value, '성수');
    assert.doesNotMatch(app.markup, /예시 국밥집/);
    app.click('toggle-selection');
    let checkbox = app.control('select-place', 'shared-cafe');
    checkbox.value = 'on';
    app.emit('input', checkbox);
    assert.equal(app.control('select-place', 'shared-cafe').checked, true);
    assert.match(app.markup, /href="#\/todo\/UI-02\/2-4"[^>]*>선택해서 복제/);
    checkbox = app.control('select-place', 'shared-cafe');
    app.emit('input', checkbox);
    assert.equal(app.control('select-place', 'shared-cafe').checked, false);
    assert.match(app.markup, /<button[^>]*disabled[^>]*>선택해서 복제/);
  });
});

test('목록에서 선택한 뒤 지도와 목록으로 전환하면 등록 버튼과 초기 선택 상태를 복원한다', async () => {
  await withApp((app) => {
    app.preset('4-4');
    app.click('toggle-selection');
    app.emit('input', app.control('select-place', 'shared-cafe'));
    app.navigate('#/map');
    assert.match(app.markup, />\+ 링크 등록<\/a>/);
    app.navigate('#/map?view=list');
    assert.doesNotMatch(app.markup, /type="checkbox"|선택 취소/);
    assert.match(app.markup, /<button[^>]*disabled[^>]*>선택해서 복제/);
  });
});
