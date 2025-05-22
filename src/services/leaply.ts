import { OpenAIClient } from './openai.ts';

// 產品目錄
const catalog = [
  { id: "P001", name: "小琉球潛水＋島語英語營", duration: 8, price: 42000, tags: ["潛水", "英語"] },
  { id: "P002", name: "花東部落文化深潛旅",   duration: 14, price: 68000, tags: ["潛水", "文化"] },
  { id: "P003", name: "峇里島遠距工作瑜伽包", duration: 21, price: 95000, tags: ["瑜伽", "遠距"] }
];

// 搜尋產品
function searchProducts(criteria: {
  duration_min?: number;
  duration_max?: number;
  tags?: string[];
  budget_twd?: number;
}) {
  const { duration_min = 1, duration_max = 365, tags = [], budget_twd = Infinity } = criteria;
  return catalog.filter(p =>
    p.duration >= duration_min &&
    p.duration <= duration_max &&
    p.price <= budget_twd &&
    tags.every(t => p.tags.includes(t))
  );
}

// 創建訂單
function createOrder(userId: string, productId: string, date: string) {
  return {
    orderId: `ORD-${Date.now()}`,
    paymentLink: `https://pay.demo/tx/${productId}-${Date.now()}`,
    productId,
    date
  };
}

// 從文本中提取 JSON 區塊
function extractJson(block: string, tag: string) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const match = block.match(regex);
  return match ? JSON.parse(match[1]) : null;
}

export class LeaplyService {
  private openaiClient: OpenAIClient;
  private _userId: string;

  constructor(openaiClient: OpenAIClient, userId: string = 'demo-user') {
    this.openaiClient = openaiClient;
    this._userId = userId;
  }

  async processMessage(userMessage: string, systemPrompt: string) {
    // 直接從用戶訊息中分析關鍵詞並搜尋產品
    let searchCriteria = this.extractSearchCriteriaFromMessage(userMessage);
    
    // 如果能從用戶訊息中提取到搜尋條件，直接搜尋並返回結果
    if (searchCriteria) {
      const results = searchProducts(searchCriteria);
      console.log("\n[直接搜尋結果]", results);
      
      if (results.length > 0) {
        // 格式化搜尋結果為人類可讀格式
        return this.formatSearchResults(results);
      }
    }
    
    // 如果無法直接提取搜尋條件或沒有結果，則進行對話
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage }
    ];

    let finished = false;
    let finalResponse = '';

    while (!finished) {
      const completion = await this.openaiClient.createChatCompletion({
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        messages,
        temperature: 0.7,
        max_tokens: 512
      });

      const assistantMsg = completion.choices[0]?.message?.content || '';
      console.log("\nLeaply AI >>>\n" + assistantMsg);
      
      // 添加到消息歷史
      messages.push({ role: 'user', content: `AI回應：${assistantMsg}` });
      
      // 檢查是否有搜尋請求
      const searchJson = extractJson(assistantMsg, 'SEARCH');
      if (searchJson) {
        const results = searchProducts(searchJson);
        console.log("\n[searchProducts 回傳]", results);
        
        if (results.length > 0) {
          // 直接返回搜尋結果
          return this.formatSearchResults(results);
        } else {
          // 如果沒有結果，添加到消息歷史並繼續對話
          messages.push({
            role: 'user' as const,
            content: `很抱歉，沒有找到符合條件的旅行產品。`
          });
          continue;
        }
      }
      
      // 檢查用戶訊息是否包含產品編號
      const productNumberMatch = userMessage.match(/方案(\d+)/) || userMessage.match(/選擇(\d+)/) || userMessage.match(/^(\d+)$/);
      if (productNumberMatch) {
        const productIndex = parseInt(productNumberMatch[1]) - 1;
        if (productIndex >= 0 && productIndex < catalog.length) {
          const selectedProduct = catalog[productIndex];
          const order = createOrder(this._userId, selectedProduct.id, new Date().toISOString().split('T')[0]);
          console.log("\n[createOrder 回傳]", order);
          
          // 設置最終回應並結束對話
          finalResponse = `【沈翊衡】已為您預訂「${selectedProduct.name}」，請前往以下連結完成付款：${order.paymentLink}`;
          finished = true;
          continue;
        }
      }
      
      // 檢查是否有創建訂單請求
      const orderJson = extractJson(assistantMsg, 'CREATE_ORDER');
      if (orderJson) {
        const order = createOrder(this._userId, orderJson.product_id, orderJson.date);
        console.log("\n[createOrder 回傳]", order);
        
        // 將結果添加為工具回覆
        messages.push({
          role: 'user' as const,
          content: `已為你建立訂單：${order.paymentLink}`
        });
        
        // 設置最終回應並結束對話
        finalResponse = `【沈翊衡】已為您建立訂單，請前往以下連結完成付款：${order.paymentLink}`;
        finished = true;
        continue;
      }
      
      // 檢查安全模式
      if (assistantMsg.includes('<SAFE_MODE>')) {
        finalResponse = '我們注意到您的訊息可能包含敏感內容。如需協助，請聯繫我們的客服團隊。';
        finished = true;
        continue;
      }
      
      // 一般回應
      finalResponse = assistantMsg;
      finished = true;
    }
    
    return finalResponse;
  }
  
  // 從用戶訊息中提取搜尋條件
  private extractSearchCriteriaFromMessage(message: string): any {
    // 預設搜尋條件
    const criteria: any = {
      duration_min: 1,
      duration_max: 365,
      tags: [],
      budget_twd: 100000
    };
    
    // 分析預算
    if (message.includes('預算')) {
      const budgetMatch = message.match(/(\d+)萬/) || message.match(/(\d+)元/) || message.match(/(\d+)塊/);
      if (budgetMatch) {
        const amount = parseInt(budgetMatch[1]);
        // 如果是「X萬」格式，轉換為元
        if (message.includes('萬')) {
          criteria.budget_twd = amount * 10000;
        } else {
          criteria.budget_twd = amount;
        }
      }
    }
    
    // 分析天數/時間
    if (message.includes('天') || message.includes('日')) {
      const daysMatch = message.match(/(\d+)[天日]/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        criteria.duration_min = Math.max(days - 2, 1);
        criteria.duration_max = days + 2;
      }
    }
    
    // 分析標籤/活動類型
    if (message.includes('潛水')) {
      criteria.tags.push('潛水');
    }
    if (message.includes('英語') || message.includes('英文')) {
      criteria.tags.push('英語');
    }
    if (message.includes('文化')) {
      criteria.tags.push('文化');
    }
    if (message.includes('瑜伽')) {
      criteria.tags.push('瑜伽');
    }
    if (message.includes('遠距') || message.includes('工作')) {
      criteria.tags.push('遠距');
    }
    
    // 如果沒有提取到任何標籤，返回 null
    if (criteria.tags.length === 0) {
      return null;
    }
    
    return criteria;
  }
  
  // 格式化搜尋結果為人類可讀格式
  private formatSearchResults(results: any[]): string {
    if (results.length === 0) {
      return '【沈翊衡】很抱歉，我們沒有找到符合您需求的旅行產品。請嘗試調整您的預算或其他條件。';
    }
    
    let response = '【何芷婷】根據您的需求，我找到了以下旅行方案：\n\n';
    
    results.forEach((product, index) => {
      response += `${index + 1}. ${product.name}\n`;
      response += `   ⏱️ 天數：${product.duration} 天\n`;
      response += `   💰 價格：${product.price.toLocaleString()} 元\n`;
      response += `   🏷️ 標籤：${product.tags.join('、')}\n\n`;
    });
    
    response += '如果您對某個方案感興趣，請回覆方案編號，我可以為您提供更多詳細資訊或協助您預訂。';
    
    return response;
  }
}
