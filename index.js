// ==========================================================================
// server/index.js · CCI Backend — API proxy + statik dosya servisi
// ==========================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Anthropic API anahtarı sunucu ortamında saklanır
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

// ---------- Middleware ----------
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- Tamamlanan oturumlar (bellekte) ----------
const completedSessions = new Set();

// ---------- API Proxy ----------
app.post('/api/reflect', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API anahtarı sunucu tarafında yapılandırılmamış.' });
  }

  const { answers, sessionId } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Geçersiz oturum.' });
  }

  // Aynı oturumdan ikinci istek engelle
  if (completedSessions.has(sessionId)) {
    return res.status(403).json({ error: 'Bu görüşme zaten tamamlanmış.' });
  }

  if (!Array.isArray(answers) || answers.length !== 5) {
    return res.status(400).json({ error: 'Beş adet cevap gerekli.' });
  }

  try {
    const prompt = buildPrompt(answers);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Anthropic API hatası (${response.status})`;
      try {
        const err = JSON.parse(errText);
        if (err.error?.message) msg += `: ${err.error.message}`;
      } catch { /* ignore */ }
      return res.status(response.status).json({ error: msg });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // Oturumu tamamlandı olarak işaretle
    completedSessions.add(sessionId);

    return res.json({ reflection: text });

  } catch (err) {
    console.error('Reflect endpoint error:', err);
    return res.status(500).json({ error: 'Sunucu hatası: ' + (err.message || 'bilinmeyen') });
  }
});

// ---------- SPA fallback ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`CCI server running on port ${PORT}`);
  if (!ANTHROPIC_API_KEY) {
    console.warn('⚠  ANTHROPIC_API_KEY env değişkeni ayarlanmamış!');
  }
});


// ==========================================================================
// Prompt builder — Savickas CCI çerçevesi
// ==========================================================================
function buildPrompt(answers) {
  const questions = [
    'Büyürken kime hayrandınız? Onun hakkında bana biraz anlatır mısınız?',
    'Düzenli olarak takip ettiğiniz web sayfaları, YouTube kanalları ya da sosyal medya hesapları var mı? Bunlarda ne tarz içerikler üretiyorsunuz ve hangi yönlerini seviyorsunuz?',
    'En sevdiğiniz kitap ya da film hangisi? Hikâyesini bana anlatır mısınız?',
    'En sevdiğiniz söz ya da motto nedir?',
    'En erken anılarınız neler? Üç ile altı yaşları arasında başınıza geldiğini hatırladığınız üç olay.'
  ];

  const formatted = answers
    .map((a, i) => `**Soru ${i + 1}:** ${questions[i]}\n**Cevap:** ${a.answer || '(boş)'}`)
    .join('\n\n');

  return `Sen, Mark L. Savickas'ın Kariyer İnşa Kuramı (Career Construction Theory) ve Kariyer İnşa Görüşmesi (CCI) protokolüne hâkim, deneyimli bir kariyer danışmanısın.

Aşağıda Savickas'ın CCI manual'inden alınan orijinal referans metin ve ardından danışanın beş soruya verdiği cevaplar yer alıyor. Yansıtmanı bu referans metne sadık kalarak yap.

=== SAVICKAS CCI REFERENCE (Chapter 3) ===

Career Construction Interview
The Career Construction Interview (CCI) is a structured dialogue during which counselors inquire about five topics that uncover life themes and inform decision making about the current transition. The topics address role models; magazines, television programs, or websites; current favorite story; frequent saying or motto; and early recollections. Counselors begin the interview after establishing a relationship, aligning goals, and describing the counseling process. Counselors then ask the five CCI questions to provide a scaffold for making sense, declaring purpose, forming intentions, and prompting action.
The CCI concentrates client reflection through a gentle, progressive, and step-by-step inquiry that leads them to deeper accounts of their past experience and current concerns. As clients respond to the questions, counselors show interest and curiosity. Counselors also try to elicit novel ideas and elaborate client statements that express increased motivation for dealing with barriers, changes accomplished and anticipated, heightened self-awareness, reconsideration of problem causes and consequences, new perspectives on the problem, deeper understandings of the problem, and intentions to explore and plan.

CCI Question 1: Role Models
Goal: Identify nouns and adjectives that describe a client's construction and conception of self.
Rationale: Career construction counselors inquire about role models because selecting role models is the very first career choice that individuals make. If a counselor can ask only one question, then this is it. Answers to this question provide the characters and attributes that the client used as a blueprint for self-construction. During late adolescence, individuals integrate these attributes or identity fragments into an initial vocational identity.
Tips: Listen for repeated words because repetition signals core attributes. Parents are taken in as heteronomous influences, in comparison to role models who are taken on as autonomous identifications.

CCI Question 2: Magazines, Television, Websites
Goal: Identify the types of environments, activities, and objects that interest the client.
Rationale: Interest is the feeling experienced when one's attention, concern, or curiosity is particularly engaged by something. The preferred method when counseling an individual is to assess manifest interests, because they have the best predictive validity. Counselors assess manifest interests by identifying characteristics of the actual environments in which clients routinely place themselves, either actually or vicariously. This is because interest involves a psychosocial connection between a person and an environment. Therefore, interests always require an object or environment. This is CCC's method for examining client's occupational resemblance, congruence, and correspondence.
Tips: The goal is not to survey or inventory shows or reading materials, it is to determine the type of vicarious environments an individual prefers. Make sure to identify the actual interests that prompt preferences. Have clients explain in their own words what attracts them to the activities or objects.

CCI Question 3: Favorite Story
Goal: Understand the stories or cultural scripts that a client may be using to envision the transition outcome.
Rationale: A story from a movie or a book becomes a favorite for individuals because it depicts a strategy that they need in scripting their transition. Implicit in the favorite story may be an incipient plan for the next episode in their life story. Clients' favorite stories lay open their lives to themselves and clarify what they might do next. In clients' favorite stories, counselors typically see a faint outline of what clients think may be possible or even an inchoate plan. An individual's character as an actor remains fairly stable during a lifetime, whereas scripts change to enable an actor to adapt to a new work setting. Each new setting may need a new script; thus individuals typically use a new story to make a career change. A new favorite story provides viable schemes and strategies from which to script a scenario for the career transition.
Tips: Emphasize "currently" or "right now." Career construction theory views scripts as sources of adaptability and flexibility in new settings or stages.

CCI Question 4: Favorite Saying
Goal: Learn the advice that a client has been giving to self.
Rationale: A CCC goal is to have clients hear and respect their own wisdom. This goal follows from the principle that "the patient and only the patient has the answers" (Winnicott, 1969). A favorite saying articulates the best advice that a client has for herself or himself. The advice typically bears directly on the problem described in the transition narrative and usually makes immediate sense to both the client and counselor. The saying conveys an auto-therapy in which clients repeatedly tell the self what they must do to advance their story to a new chapter and in so doing become more complete.

CCI Question 5: Early Recollections
Goal: Understand the perspective from which a client views the problem presented in the transition narrative.
Rationale: It is useful for counselors to consider the perspective from which clients view the presenting problem or current career concern. To explore a client's perspective, constructionist counselors inquire about early recollections because these memories usually portray a highly personal reconstruction of experience that represents the current situation (Mayman, 1960; Mosak, 1958). Typically, the first ER alludes to the perspective from which the client views the career problem. Continuing to use the metaphor of a self performing on a stage, the ERs tell how the director of the play sees the scene.
Tips: The ER must be about a specific incident. Try to get at least four sentences for each ER.

Closing: After completing the CCI, counselors study the collection of small stories and compose them into a large story to use in the client's decision making and planning.

=== END OF REFERENCE ===

**Yansıtmanda şunlara değin (Savickas'ın çerçevesine sadık kalarak):**
1. **Kahramanlar / Self (Soru 1):** Hayran olunan kişi, danışanın inşa etmek istediği benliğin taslağıdır. Hangi nitelikler, sıfatlar ve isimler öne çıkıyor? Tekrar eden kelimeler çekirdek nitelikleri işaret eder.
2. **Sahneler / Manifest İlgiler (Soru 2):** Tercih edilen ortamlar — danışanın kendini yerleştirdiği gerçek ya da dolaylı ortamlardır. Kişi-çevre uyumunu (occupational resemblance, congruence) yansıtır.
3. **Senaryo / Script (Soru 3):** Sevilen hikâye, danışanın kariyerindeki geçişi senaryolaştırmak için kullandığı stratejiyi içerir. Hikâyede danışanın "bundan sonra ne yapabileceğinin" belirsiz bir taslağı gizlidir.
4. **Tavsiye / Oto-terapi (Soru 4):** Motto, danışanın kendine verdiği en iyi tavsiyedir ve doğrudan mevcut meseleye işaret eder. Bu bir oto-terapi biçimidir.
5. **Erken Anılar / Perspektif (Soru 5):** Erken anılar, danışanın mevcut kariyer sorununu hangi perspektiften gördüğünü ortaya koyar. İlk anı genellikle bu perspektifi doğrudan yansıtır.

**Yapı:**
- Kısa bir giriş paragrafı (danışana hitap eden, sıcak)
- Yukarıdaki beş başlığı ele alan, her biri 2-3 cümlelik gözlemler
- Bağlayıcı bir "yaşam portresi" paragrafı: kahraman (self-construction blueprint) + meselenin çözümü (motto/oto-terapi) + sahne formülü (manifest ilgiler)
- Üzerinde durulabilecek 2-3 düşündürücü soru (danışanın bir kariyer danışmanıyla konuşurken kullanabileceği)

**Önemli kurallar:**
- Türkçe yaz.
- Klinik tanı koyma, patolojikleştirme.
- "Bence", "anlıyorum ki" gibi yumuşak ifadeler kullan; kesin yargılarda bulunma.
- 250-400 kelime arası tut.
- Markdown başlık (#) kullanma; kalın harfle (**...**) bölümleri ayırabilirsin.

**Geçersiz cevap kontrolü:**
- Eğer cevaplardan biri veya birkaçı anlamsız, rastgele, tekrar eden kelimelerden oluşan, soruyla ilgisiz veya kasıtlı olarak saçma yazılmışsa: o soru için yansıtma üretme.
- Bunun yerine hangi soruların değerlendirilemediğini ve nedenini kısaca belirt.
- Eğer cevapların çoğunluğu (3 veya daha fazlası) geçersizse, hiçbir yansıtma üretme. Sadece şunu yaz: "Verdiğiniz cevaplar değerlendirme için yeterli içerik taşımamaktadır. Anlamlı bir yansıtma oluşturabilmemiz için lütfen soruları içtenlikle ve detaylı biçimde cevaplayınız."

---

${formatted}

---

Şimdi yansıtma metnini yaz.`;
}
