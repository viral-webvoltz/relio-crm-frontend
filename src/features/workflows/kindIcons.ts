import { Bell, Bolt, CheckSquare, Clock, Globe, Mail, Pencil, Split } from 'lucide-react'
import type { Kind } from './graph'

export const kindIcons: Record<Kind, typeof Bolt> = { trigger: Bolt, condition: Split, create_task: CheckSquare, notify: Bell, update_record: Pencil, send_email: Mail, http_request: Globe, delay: Clock }
