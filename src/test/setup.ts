import '@testing-library/jest-dom/vitest'

// jsdom은 scrollTo를 구현하지 않아 호출할 때마다 "Not implemented" 경고를 찍는다.
// 운동 전환 시 맨 위로 스크롤하는 코드가 이를 부르므로 no-op으로 막아 둔다.
window.scrollTo = () => {}
