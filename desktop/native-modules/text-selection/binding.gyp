{
  "targets": [
    {
      "target_name": "text_selection",
      "sources": [
        "src/text_selection.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        [
          "OS=='mac'",
          {
            "xcode_settings": {
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "CLANG_CXX_LIBRARY": "libc++",
              "MACOSX_DEPLOYMENT_TARGET": "10.15",
              "OTHER_CPLUSPLUSFLAGS": ["-std=c++17", "-stdlib=libc++"]
            },
            "link_settings": {
              "libraries": [
                "-framework ApplicationServices",
                "-framework Cocoa",
                "-framework Carbon"
              ]
            }
          }
        ],
        [
          "OS=='win'",
          {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1
              }
            },
            "libraries": [
              "-loleacc.lib",
              "-luiautomationcore.lib",
              "-lole32.lib"
            ]
          }
        ],
        [
          "OS=='linux'",
          {
            "libraries": [
              "-lX11",
              "-lXtst"
            ]
          }
        ]
      ]
    }
  ]
}