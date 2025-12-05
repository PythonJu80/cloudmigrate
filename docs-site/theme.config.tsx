import React from 'react'

const config = {
  logo: <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>CloudFabric Docs</span>,
  project: {
    link: 'https://github.com/PythonJu80/cloudmigrate',
  },
  docsRepositoryBase: 'https://github.com/PythonJu80/cloudmigrate/tree/main/docs-site',
  footer: {
    text: '© 2025 CloudFabric. All rights reserved.',
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="CloudFabric Documentation" />
      <meta property="og:description" content="CloudFabric Documentation" />
      <title>CloudFabric Docs</title>
    </>
  ),
  useNextSeoProps() {
    return {
      titleTemplate: '%s - CloudFabric Docs'
    }
  },
  primaryHue: 175,
  primarySaturation: 70,
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    backToTop: true,
  },
  feedback: {
    content: null,
  },
  editLink: {
    component: null,
  },
}

export default config
