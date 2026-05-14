import { TabScreenStack } from '@/components/navigation/TabScreenStack'
import { SPINVAULT_LOGO_HORIZONTAL_PNG } from '@/lib/brand-assets'

export default function PlayTabLayout() {
  return <TabScreenStack title="Lucky Slots" headerLogo={SPINVAULT_LOGO_HORIZONTAL_PNG} />
}
