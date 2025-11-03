// server.js (proxy to llama-server)
//  - Expo 프런트는 여전히 http://<PC-IP>:4000/api/chat 만 호출
//  - 여기서 llama-server(OpenAI compatible)로 전달하여 응답을 래핑

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// llama-server 주소 (기본: 로컬 8080). 필요시 환경변수로 바꿔도 됨.
const LLAMA_API_BASE = process.env.LLAMA_API_BASE || 'http://127.0.0.1:8080';

// fetch 준비: Node 18+면 글로벌 fetch 사용, 아니면 node-fetch 동적 import
const _fetch = global.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});

const SYSTEM_PROMPT =
  '너는 한국어로만 대답하는 따뜻한 감정일기 상담 도우미야. ' +
  '항상 자연스럽고 간결한 한국어로 답하고, 공감 한 문장 + 짧은 제안 한 문장을 우선해줘.';
  
// 헬스체크
app.get('/health', async (req, res) => {
  try {
    // llama-server 상태 간단 체크
    const r = await _fetch(`${LLAMA_API_BASE}`);
    res.json({ ok: true, llamaServer: LLAMA_API_BASE, reachable: r.ok });
  } catch (e) {
    res.json({ ok: true, llamaServer: LLAMA_API_BASE, reachable: false, error: String(e) });
  }
});

// 메인 프록시 엔드포인트
app.post('/api/chat', async (req, res) => {
  const { message = '' } = req.body || {};
  if (!message.trim()) {
    return res.status(400).json({ success: false, response: '메시지를 비워둘 수 없어요.' });
  }

  try {
    // llama-server(OpenAI 호환)로 전달
    const body = {
      model: 'local-llama', // llama-server는 파일 경로로 이미 모델을 띄워두었으므로 이름은 임의여도 OK
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 256,
      stream: false,
    };

    const r = await _fetch(`${LLAMA_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await r.json().catch(() => null);
    if (!r.ok || !data) {
      const text = await r.text().catch(() => '');
      throw new Error(`llama-server error: ${r.status} ${text || ''}`);
    }

    // OpenAI 호환 응답 → 텍스트 꺼내기
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      '응답을 이해하지 못했어요.';

    res.json({ success: true, response: String(content) });
  } catch (e) {
    console.error('[proxy error]', e);
    res.status(500).json({
      success: false,
      response: `프록시 오류: ${String(e).slice(0, 4000)}`,
    });
  }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] proxy listening on http://0.0.0.0:${PORT}`);
  console.log(`[server] llama-server base: ${LLAMA_API_BASE}`);
});
