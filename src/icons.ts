const iconModules = import.meta.glob('@/assets/icons/**/*.svg', {
  query: '?component',
  import: 'default',
  eager: true,
})

export const ICONS = Object.fromEntries(
  Object.entries(iconModules).map(([path, component]) => {
    const pathParts = path.split('/')
    const fileName = pathParts.pop()?.replace('.svg', '') || ''
    const iconName = fileName

    const iconsIndex = pathParts.indexOf('icons')
    const type = iconsIndex !== -1 && pathParts[iconsIndex + 1] ? pathParts[iconsIndex + 1] : 'default'

    return [iconName, { component, type }]
  }),
)

export const ICONS_LIST = Object.entries(ICONS)
