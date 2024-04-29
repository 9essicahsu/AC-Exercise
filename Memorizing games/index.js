const GAME_STATE = {
  FirstCardAwaits: 'FirstCardAwaits',
  SecondCardAwaits: 'SecondCardAwaits',
  CardsMatchFailed: 'CardsMatchFailed',
  CardsMatched: 'CardsMatched',
  GameFinished: 'GameFinished'
}

// Symbols內儲存的資料不會變動, 所以習慣將首字母大寫表現此特性
const Symbols = [
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17989/__.png', // 黑桃
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17992/heart.png', // 愛心
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17991/diamonds.png', // 方塊
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17988/__.png' // 梅花
]

// 和畫面顯示有關
const view = {
  // 牌背元件, 遊戲初始化時會透過view.displayCards直接呼叫, 運用dataset把卡片索引綁在HTML元素上
  getCardElement(index) {
    return `<div data-index="${index}" class="card back"></div>`
  },

  // 負責生成卡片內容, 包含花色和數字, 使用者點擊時才由負責翻牌的函式呼叫
  getCardContent(index) {
    const number = this.transformNumber((index % 13) + 1)
    const symbol = Symbols[Math.floor(index / 13)]
    return `
      <p>${number}</p>
      <img src="${symbol}" />
      <p>${number}</p>
    `
  },

  // 特殊數字轉換
  transformNumber(number) {
    switch (number) {
      case 1:
        return 'A'
      case 11:
        return 'J'
      case 12:
        return 'Q'
      case 13:
        return 'K'
      default:
        return number
    }
  },

  // 負責選出cards並抽換內容
  displayCards(indexes) {
    const rootElement = document.querySelector('#cards')
    // 用map迭代陣列, 依序將數字丟進getCardElement中, 得到52張卡片的陣列, 並把陣列合併成大字串才能當成HTML template使用
    rootElement.innerHTML = indexes.map(index => this.getCardElement(index)).join('')
  },

  flipCards(...cards) {
    cards.map(card => {
      // 如果card元素包含back, 將back刪除, 會將那一張卡片的index傳入getCardContent函式, card的HTML就會顯示出那張的花色與數字
      if (card.classList.contains('back')) {
        // 回傳正面
        card.classList.remove('back')
        card.innerHTML = this.getCardContent(Number(card.dataset.index))
        return
      }
      // 回傳背面
      // 如果card元素不包含back, 加上back, card的HTML不會顯示任何值, 會顯示出在CSS中設定的background圖片
      card.classList.add('back')
      card.innerHTML = null
    })
  },

  // 當數字配對成功, 將配對成功的元素上加上paired
  pairCards(...cards) {
    cards.map(card => {
      card.classList.add('paired')
    })
  },

  renderScore(score) {
    document.querySelector(".score").textContent = `Score: ${score}`;
  },

  renderTriedTimes(times) {
    document.querySelector(".tried").textContent = `You've tried: ${times} times`;
  },

  appendWrongAnimation(...cards) {
    cards.map(card => {
      card.classList.add('wrong')
      card.addEventListener('animationed', event => event.target.classList.remove('wrong'), { once: true })
    })
  },

  showGameFinished() {
    const div = document.createElement('div')
    div.classList.add('completed')
    div.innerHTML = `
      <p>Complete!</p>
      <p>Score: ${model.score}</p>
      <p>You've tried: ${model.triedTimes} times</p>
    `
    const header = document.querySelector('#header')
    header.before(div)
  }
}

const model = {
  revealedCards: [],
  // 2個數字配對成功, 回傳那兩個dataset的index
  isRevealedCardsMatched() {
    return this.revealedCards[0].dataset.index % 13 === this.revealedCards[1].dataset.index % 13
  },

  score: 0,

  triedTimes: 0
}

// 所有動作應該由controller統一發派, view或model等其他元件只有被controller呼叫時才會動作
const controller = {
  currentState: GAME_STATE.FirstCardAwaits,
  // 產生隨機排列的52張牌
  generateCards() {
    view.displayCards(utility.getRandomNumberArray(52))
  },

  dispatchCardAction(card) {
    // 先挑出不是back的牌(代表已經被點擊或已經被配對過), 如果不是back的話就結束
    if (!card.classList.contains('back')) {
      return
    }
    switch (this.currentState) {
      // 如果是在FirstCardAwaits的狀態點擊卡片時, 會翻開卡片, 將點擊的卡片放入revealedCards[]中, 然後狀態變成SecondCardAwaits
      case GAME_STATE.FirstCardAwaits:
        view.flipCards(card)
        model.revealedCards.push(card)
        this.currentState = GAME_STATE.SecondCardAwaits
        break
      // 如果是在SecondCardAwaits的狀態點擊卡片的話, 會呼叫flipCard函式, 函式回翻開卡片, 並改變花色和數字, 將點擊的卡片再放入revealedCards[]中,並判斷2個數字是否配對成功
      case GAME_STATE.SecondCardAwaits:
        view.renderTriedTimes(++model.triedTimes)
        view.flipCards(card)
        model.revealedCards.push(card)
        // 判斷配對是否成功
        if (model.isRevealedCardsMatched()) {
          view.renderScore(model.score += 10)
          // 如果配對成功, 進入CardsMatched的狀態, 呼叫pairCard函式後, 將revealedCards[]清空, 再將狀態改成FirstCardAwaits
          this.currentState = GAME_STATE.CardsMatched
          view.pairCards(...model.revealedCards)
          model.revealedCards = []
          if (model.score === 260) {
            console.log('showGameFinished')
            this.currentState = GAME_STATE.GameFinished
            view.showGameFinished()
            return
          }
          this.currentState = GAME_STATE.FirstCardAwaits
        } else {
          // 如果配對失敗, 進入CardsMatchFailed的狀態, 先停留1秒, 呼叫flipCard函式, 將點擊到的元素加上back, 並翻回背面, 再將狀態改成FirstCardAwaits
          this.currentState = GAME_STATE.CardsMatchFailed
          view.appendWrongAnimation(...model.revealedCards)
          // 使用setTimeout呼叫內建的計時器, 第一個參數式想要執行的函釋內容, 第二個參數時要停留的秒數, 等計時器跑完後就會執行函式內容
          setTimeout(this.resetCards, 1000)
        }
        break
    }
    // console.log('this.currentState', this.currentState)
    // console.log('revealedCards', model.revealedCards.map(card => card.dataset.index))
  },

  resetCards() {
    view.flipCards(...model.revealedCards)
    model.revealedCards = []
    controller.currentState = GAME_STATE.FirstCardAwaits
  }
}

// 隨機重組陣列項目
const utility = {
  getRandomNumberArray(count) {
    const number = Array.from(Array(count).keys())
    for (let index = number.length - 1; index > 0; index--) {
      let randomIndex = Math.floor(Math.random() * (index + 1))
        ;[number[index], number[randomIndex]] = [number[randomIndex], number[index]]
    }
    return number
  }
}

controller.generateCards()

// 抓到所有.card元素, 再用迭代器將每個.card元素掛上監聽器
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', event => {
    controller.dispatchCardAction(card)
  })
})