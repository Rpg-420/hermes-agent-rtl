const noop = () => {}
export const KEYBINDS_AREA = 'keybinds'
export const PALETTE_AREA = 'palette'
export const STATUSBAR_AREAS = { left: 'statusBar.left', right: 'statusBar.right' }
export const TITLEBAR_AREAS = { left: 'titleBar.left', center: 'titleBar.center', right: 'titleBar.right' }
export const ToggleRow = noop
export const ListRow = noop
export const SegmentedControl = noop
export const Popover = noop
export const PopoverContent = noop
export const PopoverTrigger = noop
export const Tip = noop
export const atom = v => ({ get: () => v, set: () => {}, subscribe: () => () => {} })
export const cn = (...a) => a.filter(Boolean).join(' ')
export const host = { notify: noop, notifyError: noop, request: async () => ({}) }
export const icons = { Globe: noop }
export const usePluginI18n = () => k => k
export const useValue = () => ({})
export default {}
