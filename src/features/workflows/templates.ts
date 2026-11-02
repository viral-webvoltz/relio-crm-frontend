import type { WorkflowPayload } from './types'

// Starts paused: the services text has bracketed gaps that must be filled in before it is turned on.
// Sending from a lead's workflow logs the email on the lead, and the lead's reply moves its status:
// interested -> qualified, not interested -> unqualified, anything else is left for the team to read.
export const leadWelcomeTemplate: WorkflowPayload = {
  name: 'Introduce our services to new leads',
  trigger: 'leads.create',
  isActive: false,
  graph: {
    nodes: [
      { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, config: { event: 'leads.create' } },
      {
        id: 'intro-email',
        type: 'send_email',
        position: { x: 0, y: 140 },
        config: {
          to: '{{email}}',
          subject: '{{firstName}}, here is how we can help',
          body: [
            'Hi {{firstName}},',
            '',
            'Thanks for getting in touch. Here is a quick look at what we do:',
            '',
            '- [Service one]: one line on what it gives you',
            '- [Service two]: one line on what it gives you',
            '- [Service three]: one line on what it gives you',
            '',
            'Would you like to hear more? Reply to this email and tell us what you need.',
            'If now is not the right time, just reply "not interested" and we will leave you be.',
            '',
            'Best regards,',
            '[Your name]',
            '[Company]',
          ].join('\n'),
        },
      },
    ],
    edges: [{ id: 'trigger-to-intro', source: 'trigger', sourceHandle: 'next', target: 'intro-email' }],
  },
}
