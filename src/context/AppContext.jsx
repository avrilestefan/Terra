import { createContext, useContext, useReducer, useEffect } from 'react'
import staticLots from '../data/lots'

const initialState = {
  lots: [],
  selectedLotId: null,
  placedRooms: [],
  capturedFrame: null,
  pitchControl: 45,
  activePanel: null,
  activeFilters: ['available', 'occupied', 'reserved']
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOTS':
      return { ...state, lots: action.lots }
    case 'SELECT_LOT':
      return { ...state, selectedLotId: action.id }
    case 'ADD_ROOM':
      return { ...state, placedRooms: [...state.placedRooms, action.room] }
    case 'UPDATE_ROOM_POSITION':
      return {
        ...state,
        placedRooms: state.placedRooms.map(r =>
          r.id === action.id ? { ...r, position: action.position } : r
        )
      }
    case 'REMOVE_ROOM':
      return {
        ...state,
        placedRooms: state.placedRooms.filter(r => r.id !== action.id)
      }
    case 'CLEAR_ROOMS':
      return { ...state, placedRooms: [] }
    case 'ROTATE_ROOM':
      return {
        ...state,
        placedRooms: state.placedRooms.map(r =>
          r.id === action.id
            ? { ...r, rotationY: ((r.rotationY ?? 0) + action.delta + Math.PI * 2) % (Math.PI * 2) }
            : r
        )
      }
    case 'SET_CAPTURED_FRAME':
      return { ...state, capturedFrame: action.frame }
    case 'SET_PITCH':
      return { ...state, pitchControl: action.pitch }
    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.panel }
    case 'TOGGLE_FILTER': {
      const has = state.activeFilters.includes(action.status)
      const next = has
        ? state.activeFilters.filter(s => s !== action.status)
        : [...state.activeFilters, action.status]
      return { ...state, activeFilters: next }
    }
    default:
      return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    dispatch({ type: 'SET_LOTS', lots: staticLots })
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used inside AppProvider')
  return context
}