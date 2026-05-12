import { describe, it, expect, beforeEach } from 'vitest'
import useNotesStore from '../stores/notesStore'

beforeEach(() => {
  useNotesStore.setState({ chapters: [], selectedId: undefined, history: [], historyIndex: -1 })
})

describe('notesStore', () => {
  it('creates a chapter with default title', () => {
    const id = useNotesStore.getState().createChapter()
    const state = useNotesStore.getState()
    expect(state.chapters).toHaveLength(1)
    expect(state.chapters[0].title).toBe('Untitled')
    expect(state.chapters[0].id).toBe(id)
    expect(state.selectedId).toBe(id)
  })

  it('creates a chapter with custom title', () => {
    useNotesStore.getState().createChapter('My Notes')
    expect(useNotesStore.getState().chapters[0].title).toBe('My Notes')
  })

  it('updates a chapter title', () => {
    const id = useNotesStore.getState().createChapter('Original')
    useNotesStore.getState().updateChapter(id, { title: 'Updated' })
    expect(useNotesStore.getState().chapters[0].title).toBe('Updated')
  })

  it('selects a chapter', () => {
    const id = useNotesStore.getState().createChapter()
    useNotesStore.getState().selectChapter(undefined)
    expect(useNotesStore.getState().selectedId).toBeUndefined()
    useNotesStore.getState().selectChapter(id)
    expect(useNotesStore.getState().selectedId).toBe(id)
  })

  it('deletes a chapter', () => {
    const id1 = useNotesStore.getState().createChapter('First')
    const id2 = useNotesStore.getState().createChapter('Second')
    expect(useNotesStore.getState().chapters).toHaveLength(2)
    useNotesStore.getState().deleteChapter(id1)
    expect(useNotesStore.getState().chapters).toHaveLength(1)
    expect(useNotesStore.getState().chapters[0].id).toBe(id2)
  })

  it('sets priority color', () => {
    const id = useNotesStore.getState().createChapter()
    useNotesStore.getState().setPriorityColor(id, '#ef4444')
    expect(useNotesStore.getState().chapters[0].priorityColor).toBe('#ef4444')
  })

  it('undo restores previous content and redo restores forward', () => {
    const id = useNotesStore.getState().createChapter()
    useNotesStore.getState().updateChapter(id, { content: 'v1' })
    useNotesStore.getState().updateChapter(id, { content: 'v2' })

    useNotesStore.getState().undo()
    expect(useNotesStore.getState().chapters[0].content).toBe('')

    useNotesStore.getState().redo()
    expect(useNotesStore.getState().chapters[0].content).toBe('v1')
  })

  it('limits history to 25 entries', () => {
    const id = useNotesStore.getState().createChapter()
    for (let i = 0; i < 30; i++) {
      useNotesStore.getState().updateChapter(id, { content: `v${i}` })
    }
    expect(useNotesStore.getState().chapters[0].content).toBe('v29')
    for (let i = 0; i < 25; i++) {
      useNotesStore.getState().undo()
    }
    expect(useNotesStore.getState().canUndo()).toBe(false)
    expect(useNotesStore.getState().chapters[0].content).toBe('v4')
  })
})
