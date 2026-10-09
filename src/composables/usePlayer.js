import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'

const audio = new Audio()
const demoAudioCache = {}

// Generate a WAV blob URL with a musical tone unique per track
function generateDemoAudio(trackId) {
  if (demoAudioCache[trackId]) return demoAudioCache[trackId]

  const sampleRate = 44100
  const durationSec = 15
  const numSamples = sampleRate * durationSec

  // Pick a musical note based on track id — C major pentatonic across octaves
  const notes = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 880.0]
  const id = parseInt(trackId) || 1
  const baseFreq = notes[id % notes.length]
  // Add a second harmonic for richness
  const harmFreq = baseFreq * 1.5
  // Vary tempo of a simple pattern
  const beatHz = 2 + (id % 5)

  const data = new Float32Array(numSamples)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    // Smooth fade in (0.1s) and fade out (0.1s) to prevent clicks
    const fadeIn = Math.min(1, t / 0.1)
    const fadeOut = Math.min(1, (durationSec - t) / 0.1)
    const envelope = fadeIn * fadeOut
    // Gentle volume swell using smooth sine — no sharp edges
    const swell = 0.6 + 0.4 * Math.sin(2 * Math.PI * beatHz * t)
    // Mix sine waves with moderate amplitude
    const sample = (
      0.35 * Math.sin(2 * Math.PI * baseFreq * t) +
      0.15 * Math.sin(2 * Math.PI * harmFreq * t) +
      0.08 * Math.sin(2 * Math.PI * baseFreq * 2 * t)
    ) * envelope * swell
    data[i] = sample
  }

  // Encode as 16-bit PCM WAV
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, data[i]))
    view.setInt16(44 + i * 2, s * 0x7FFF, true)
  }

  const blob = new Blob([buffer], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  demoAudioCache[trackId] = url
  return url
}
const library = ref([])
const queue = ref([])
const originalQueue = ref([])
const currentIndex = ref(-1)
const isPlaying = ref(false)
const progress = ref(0)
const duration = ref(0)
const shuffled = ref(false)
const repeatMode = ref('off') // off, one, all
const volume = ref(1)
const loading = ref(false)

const currentTrack = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= queue.value.length) return null
  return queue.value[currentIndex.value]
})

// Audio event listeners
audio.addEventListener('timeupdate', () => {
  progress.value = audio.currentTime
  duration.value = audio.duration || 0
})

audio.addEventListener('ended', () => {
  if (repeatMode.value === 'one') {
    audio.currentTime = 0
    audio.play()
  } else if (currentIndex.value < queue.value.length - 1) {
    next()
  } else if (repeatMode.value === 'all') {
    currentIndex.value = 0
    playCurrentTrack()
  } else {
    isPlaying.value = false
  }
})

audio.addEventListener('play', () => { isPlaying.value = true })
audio.addEventListener('pause', () => { isPlaying.value = false })

function getPlayableUrl(path) {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.convertFileSrc(path)
  }
  return path
}

function playCurrentTrack() {
  const track = currentTrack.value
  if (!track) return
  if (!track.path) {
    // Demo mode: generate audio tone
    audio.src = generateDemoAudio(track.id)
  } else {
    audio.src = getPlayableUrl(track.path)
  }
  audio.play().catch(e => console.error('Play error:', e))
}

function playAll(tracks, startIdx = 0) {
  queue.value = [...tracks]
  originalQueue.value = [...tracks]
  currentIndex.value = startIdx
  if (shuffled.value) {
    shuffleQueue(true)
  }
  playCurrentTrack()
}

function playTrackFromList(tracks, track) {
  const idx = tracks.findIndex(t => t.id === track.id)
  playAll(tracks, idx >= 0 ? idx : 0)
}

function play() {
  if (audio.src) audio.play().catch(() => {})
}

function pause() {
  audio.pause()
}

function togglePlayPause() {
  if (isPlaying.value) pause()
  else play()
}

function next() {
  if (queue.value.length === 0) return
  if (currentIndex.value < queue.value.length - 1) {
    currentIndex.value++
  } else if (repeatMode.value === 'all') {
    currentIndex.value = 0
  } else {
    return
  }
  playCurrentTrack()
}

function prev() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0
    return
  }
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else if (repeatMode.value === 'all') {
    currentIndex.value = queue.value.length - 1
  }
  playCurrentTrack()
}

function seek(time) {
  audio.currentTime = time
}

function setVolume(v) {
  volume.value = v
  audio.volume = v
}

function shuffleQueue(keepCurrent = true) {
  if (queue.value.length <= 1) return
  const current = currentTrack.value
  const rest = queue.value.filter((_, i) => i !== currentIndex.value)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]]
  }
  if (keepCurrent && current) {
    queue.value = [current, ...rest]
    currentIndex.value = 0
  } else {
    queue.value = rest
    currentIndex.value = 0
  }
}

function toggleShuffle() {
  shuffled.value = !shuffled.value
  if (shuffled.value) {
    shuffleQueue(true)
  } else {
    const current = currentTrack.value
    queue.value = [...originalQueue.value]
    if (current) {
      currentIndex.value = queue.value.findIndex(t => t.id === current.id)
      if (currentIndex.value < 0) currentIndex.value = 0
    }
  }
}

function toggleRepeat() {
  const modes = ['off', 'one', 'all']
  const idx = modes.indexOf(repeatMode.value)
  repeatMode.value = modes[(idx + 1) % 3]
}

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Demo data for PC testing
function getDemoLibrary() {
  const artists = [
    { name: 'Arctic Monkeys', genre: 'Rock', albums: ['AM', 'Whatever People Say I Am', 'Favourite Worst Nightmare'] },
    { name: 'Daft Punk', genre: 'Electronic', albums: ['Random Access Memories', 'Discovery', 'Homework'] },
    { name: 'Kendrick Lamar', genre: 'Hip-Hop', albums: ['DAMN.', 'good kid, m.A.A.d city', 'To Pimp a Butterfly'] },
    { name: 'Tame Impala', genre: 'Psychedelic', albums: ['Currents', 'Lonerism', 'The Slow Rush'] },
    { name: 'The Weeknd', genre: 'R&B', albums: ['After Hours', 'Starboy', 'Dawn FM'] },
    { name: 'Billie Eilish', genre: 'Pop', albums: ['When We All Fall Asleep', 'Happier Than Ever'] },
    { name: 'Radiohead', genre: 'Alternative', albums: ['OK Computer', 'In Rainbows', 'Kid A'] },
    { name: 'Tyler, The Creator', genre: 'Hip-Hop', albums: ['IGOR', 'Flower Boy', 'Call Me If You Get Lost'] },
    { name: 'Fleetwood Mac', genre: 'Rock', albums: ['Rumours', 'Tango in the Night'] },
    { name: 'Frank Ocean', genre: 'R&B', albums: ['Blonde', 'Channel Orange'] },
  ]
  const tracks = [
    ['Do I Wanna Know?', 'R U Mine?', 'Why\'d You Only Call Me When You\'re High?', 'Arabella'],
    ['I Bet You Look Good on the Dancefloor', 'Fluorescent Adolescent', 'Teddy Picker'],
    ['Brianstorm', 'Do Me a Favour', '505'],
    ['Get Lucky', 'Instant Crush', 'Lose Yourself to Dance', 'Giorgio by Moroder'],
    ['One More Time', 'Digital Love', 'Harder, Better, Faster, Stronger', 'Something About Us'],
    ['Around the World', 'Da Funk', 'Revolution 909'],
    ['HUMBLE.', 'DNA.', 'LOYALTY.', 'ELEMENT.'],
    ['Swimming Pools', 'Backseat Freestyle', 'Money Trees', 'm.A.A.d city'],
    ['Alright', 'King Kunta', 'These Walls', 'The Blacker the Berry'],
    ['The Less I Know the Better', 'Let It Happen', 'Feels Like We Only Go Backwards'],
    ['New Person, Same Old Mistakes', 'Eventually', 'Yes I\'m Changing'],
    ['Is It True', 'Borderline', 'Lost in Yesterday', 'Breathe Deeper'],
    ['Blinding Lights', 'After Hours', 'In Your Eyes', 'Heartless'],
    ['Starboy', 'I Feel It Coming', 'Die for You', 'Reminder'],
    ['Take My Breath', 'Sacrifice', 'Gasoline', 'Out of Time'],
    ['Bad Guy', 'When the Party\'s Over', 'Bury a Friend'],
    ['Happier Than Ever', 'Therefore I Am', 'NDA', 'Oxytocin'],
    ['Paranoid Android', 'Karma Police', 'No Surprises', 'Lucky'],
    ['Reckoner', 'Nude', 'Jigsaw Falling Into Place', 'All I Need'],
    ['Everything In Its Right Place', 'Idioteque', 'How to Disappear Completely'],
    ['EARFQUAKE', 'NEW MAGIC WAND', 'A BOY IS A GUN*', 'I THINK'],
    ['See You Again', 'November', 'Who Dat Boy', 'Garden Shed'],
    ['LEMONHEAD', 'WUSYANAME', 'SWEET / I THOUGHT YOU WANTED TO DANCE'],
    ['Dreams', 'Go Your Own Way', 'The Chain', 'Everywhere'],
    ['Little Lies', 'Big Love', 'Seven Wonders'],
    ['Nights', 'Self Control', 'Ivy', 'White Ferrari', 'Godspeed'],
    ['Thinkin Bout You', 'Pyramids', 'Lost', 'Super Rich Kids'],
  ]

  let id = 1
  const songs = []
  let trackIdx = 0
  for (const artist of artists) {
    for (const album of artist.albums) {
      const albumTracks = tracks[trackIdx] || ['Track 1', 'Track 2', 'Track 3']
      for (const title of albumTracks) {
        songs.push({
          id: String(id++),
          title,
          artist: artist.name,
          album,
          genre: artist.genre,
          duration: 180000 + Math.floor(Math.random() * 120000),
          path: '',
          albumId: `album-${artist.name}-${album}`.replace(/\s+/g, '-'),
        })
      }
      trackIdx++
    }
  }
  return songs
}

export function usePlayer() {
  return {
    library,
    queue,
    currentTrack,
    currentIndex,
    isPlaying,
    progress,
    duration,
    shuffled,
    repeatMode,
    volume,
    loading,
    playAll,
    playTrackFromList,
    play,
    pause,
    togglePlayPause,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    formatTime,
    getDemoLibrary,
  }
}
