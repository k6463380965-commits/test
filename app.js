const stories = [
  {id:'01', category:'Climate', date:'TODAY', title:'Cities are learning to live with extreme heat', summary:'From shade corridors to cooling centers, adaptation is becoming a civic design challenge.', source:'Reuters', url:'https://www.reuters.com/world/'},
  {id:'02', category:'AI', date:'TODAY', title:'The next AI frontier is trust, not scale', summary:'As models become more capable, the hard questions are shifting to provenance, safety, and who gets to decide.', source:'MIT Technology Review', url:'https://www.technologyreview.com/'},
  {id:'03', category:'Markets', date:'YESTERDAY', title:'Why markets are watching the supply chain again', summary:'A new cycle of investment is redrawing the map for energy, chips, and the infrastructure beneath them.', source:'Financial Times', url:'https://www.ft.com/markets'},
  {id:'04', category:'Climate', date:'YESTERDAY', title:'The quiet economics of a changing coastline', summary:'Insurance prices are becoming an early signal of where climate risk is already landing.', source:'The Guardian', url:'https://www.theguardian.com/environment'},
  {id:'05', category:'AI', date:'2 DAYS AGO', title:'Open models are changing the shape of competition', summary:'Lower barriers to experimentation are creating a faster, stranger innovation cycle.', source:'The Verge', url:'https://www.theverge.com/ai-artificial-intelligence'},
  {id:'06', category:'Markets', date:'2 DAYS AGO', title:'The long bet on resilient infrastructure', summary:'Public and private capital are converging on the systems that keep modern life moving.', source:'Bloomberg', url:'https://www.bloomberg.com/markets'},
];

const articleGrid = document.querySelector('#articleGrid');
const summaryList = document.querySelector('#summaryList');
const searchInput = document.querySelector('#searchInput');
const resultCount = document.querySelector('#resultCount');
let activeFilter = 'all';

document.querySelector('#today').textContent = new Intl.DateTimeFormat('en-US', {month:'short', day:'2-digit', year:'numeric'}).format(new Date()).toUpperCase();

function renderSummary() {
  summaryList.innerHTML = stories.slice(0, 3).map(story => `<article class="summary-item"><span class="num">${story.id}</span><div><h3>${story.title}</h3><p>${story.summary}</p></div><time>${story.date}</time></article>`).join('');
}

function renderArticles() {
  const query = searchInput.value.trim().toLowerCase();
  const matches = stories.filter(story => {
    const matchesFilter = activeFilter === 'all' || story.category === activeFilter;
    const matchesQuery = !query || `${story.title} ${story.summary} ${story.category} ${story.source}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  resultCount.textContent = `${matches.length} ${matches.length === 1 ? 'STORY' : 'STORIES'}`;
  articleGrid.innerHTML = matches.length ? matches.map(story => `<article class="article"><span class="tag">${story.category} / ${story.date}</span><h3>${story.title}</h3><p>${story.summary}</p><div class="article-bottom"><span class="article-meta">${story.source}</span><a href="${story.url}" target="_blank" rel="noopener">Read source ↗</a></div></article>`).join('') : '<p>No stories match that search yet.</p>';
}

function answerQuestion(question) {
  const text = question.toLowerCase();
  let story = stories.find(item => text.includes(item.category.toLowerCase()));
  if (!story) story = stories[0];
  const response = `The short version: ${story.title}. ${story.summary} Fried0's read is that the important shift is from a single headline to the systems around it. Read the original reporting from ${story.source}.`;
  document.querySelector('#chatLog').insertAdjacentHTML('beforeend', `<div class="message user-message">${question}</div><div class="message agent-message">${response} <a href="${story.url}" target="_blank" rel="noopener" style="color:var(--lime)">Open article ↗</a></div>`);
  document.querySelector('#chatLog').lastElementChild.scrollIntoView({behavior:'smooth', block:'nearest'});
}

document.querySelector('#askForm').addEventListener('submit', event => { event.preventDefault(); const input = document.querySelector('#questionInput'); if (input.value.trim()) { answerQuestion(input.value.trim()); input.value = ''; }});
document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => answerQuestion(button.dataset.question)));
searchInput.addEventListener('input', renderArticles);
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button)); renderArticles(); }));
document.querySelectorAll('.search-topic').forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.topic; searchInput.value = ''; document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item.dataset.filter === activeFilter)); document.querySelectorAll('.search-topic').forEach(item => item.classList.toggle('active', item === button)); renderArticles(); document.querySelector('#library').scrollIntoView({behavior:'smooth'}); }));
renderSummary();
renderArticles();