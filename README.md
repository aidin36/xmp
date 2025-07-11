# XMP Javascript package

It can read and write XMP data from/to various file formats.

## Supported Formats

| Format | Read | Write |
| :----: | :--: | :---: |
|  JPEG  |  ✓   |   ╳   |
|  HEIC  |  ✓   |   ✓   |

### Limitations of HEIC

Writing to HEIC format has a few limitations:

- The library cannot handle numbers greater than UINT32 (4294967295) but in
  some cases HEIC can store UINT64 numbers. If it encounters those larger
  numbers while reading or writing the file, it will throw an error.

## Installation

Install it like any other `npm` package. For example:

```bash
npm install @aidin36/xmp
```

## Usage

You need to read your image as `Uint8Array`. This is the most portable format
(portable between various Javascript environments). We will provide a few
examples below. Then simply pass it to one of the functions provided.

For example in a `node` environment:

```Typescript
import { readXmpFromHeic } from '@aidin36/xmp'
import fs from 'fs'

const fileContent = new Uint8Array(fs.readFileSync('/path/to/file.heic'))
const xmp = readXmpFromHeic(fileContent)

if (!xmp) {
  console.error('Could not find any XMP data in the provided file.')
}

// xmp is a string
console.log(xmp)
```

## How to read image as Uint8Array

`Uint8Array` is the most portable structure to store image data. By portable we
mean, for example, if we were using `ArrayBuffer`, React Native wouldn't be
able to work with it.

Depending on the Javascript environment you're using, there are multiple ways
to read an image to an `Uint8Array`. We give you some examples here to get you
started.

_Node_: In `nodejs` you can simply read an image like:

```Typescript
const fileContent = new Uint8Array(fs.readFileSync('./path/to/file.heic'))
```

Or in `React Native`:

```Typescript
import RNFS from 'react-native-fs'

const base64 = await RNFS.readFile(imagePath, 'base64')

const fileContent = Uint8Array.fromBase64(base64)
```

And in a browser:

```html
<input type="file" /><br />
<img src="" height="200" alt="Image preview" />
```

```js
const preview = document.querySelector('img')
const fileInput = document.querySelector('input[type=file]')

fileInput.addEventListener('change', previewFile)

function previewFile() {
  const file = fileInput.files[0]
  const reader = new FileReader()

  reader.addEventListener(
    'load',
    () => {
      const buf = reader.result
      const fileContent = new Uint8Array(buf)
      console.log(`array= ${fileContent}`)
    },
    false
  )

  if (file) {
    reader.readAsArrayBuffer(file)
  }
}
```

Please note that these are just some examples. There are other ways to read
image to `Uint8Array` that you can choose based on your need.

## API

```Typescript
export type XMPNode = string | Record<string, string> | {
    [k: string]: XMPNode;
} | Array<string> | Array<XMPNode>

export type XMP = Record<string, XMPNode>

/**
 * This is the most portable way of reading the data. Because not every
 * Javascript environment supports TextDecoder. In those cases, you can call
 * this function and decode the output using what is available.
 *
 * If your environment has TextDecoder, or if you have a polyfill of it in your
 * application, you can use 'readXmpFromJpegBinary' function to get a decoded
 * string.
 *
 * Note that the output is encoded as UTF-8. Javascript's strings are UTF-16.
 * So you need to decode the output from UTF-8.
 *
 * @param image - Data of the JPEG image in the form of Uint8Array
 * @returns XMP as a UTF-8 byte array, or undefined if no XMP data found in the
 *   provided file.
 */
export const readXmpFromJpegAsBinary = (image: Uint8Array): Uint8Array | undefined => jpegExtractXMP(image)

/**
 * Extracts the XMP string from a JPEG file.
 * It returns the string as-is without modifications.
 *
 * Note that your Javascript environment should provide TextDecoder or a
 * polyfill of it.
 *
 * @param image - Data of the JPEG image in the form of Uint8Array
 * @returns XMP as a string, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromJpeg = (image: Uint8Array): string | undefined => {
  if (TextDecoder === undefined) {
    throw Error('This method needs TextDecoder which is not available in your environment. You can try other methods.')
  }

  const xmpBinary = jpegExtractXMP(image)
  if (xmpBinary == null) {
    return undefined
  }

  const decoder = new TextDecoder('UTF-8')
  return decoder.decode(xmpBinary)
}
/**
 * Extracts the XMP from a JPEG file, and transforms it to a JS Object.
 * It uses the '@aidin36/xmp2js' for the transformation. You can read the documents
 * of '@aidin36/xmp2js' to learn more about the output format.
 *
 * @param image - Data of the JPEG image in the form of Uint8Array
 * @returns A JS Object, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromJpegAsJs = (image: Uint8Array): XMP | undefined => {
  const xmpString = readXmpFromJpeg(image)
  if (xmpString == null || xmpString.length === 0) {
    return undefined
  }
  return xmp2js(xmpString)
}

/**
 * This is the most portable way of reading the data. Because not every
 * Javascript environment supports TextDecoder. In those cases, you can call
 * this function and decode the output using what is available.
 *
 * If your environment has TextDecoder, or if you have a polyfill of it in your
 * application, you can use 'readXmpFromHeic' function to get a decoded string.
 *
 * Note that the output is encoded as UTF-8. Javascript's strings are UTF-16.
 * So you need to decode the output from UTF-8.
 *
 * @param image - Data of the HEIC image in the form of Uint8Array
 * @returns XMP as a UTF-8 byte array, or undefined if no XMP data found in the
 *   provided file.
 */
export const readXmpFromHeicAsBinary = (image: Uint8Array): Uint8Array | undefined => heicExtractXmp(image)

/**
 * Extracts the XMP string from a HEIC file.
 * It returns the string as-is without modifications.
 *
 * Note that your Javascript environment should provide TextDecoder.
 *
 * @param image - Data of the HEIC image in the form of Uint8Array
 * @returns XMP as a string, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromHeic = (image: Uint8Array): string | undefined => {
  if (TextDecoder === undefined) {
    throw Error('This method needs TextDecoder which is not available in your environment. You can try other methods.')
  }

  const xmpBinary = heicExtractXmp(image)
  if (xmpBinary == null) {
    return undefined
  }

  const decoder = new TextDecoder('UTF-8')
  return decoder.decode(xmpBinary)
}

/**
 * Extracts the XMP string from a HEIC file, then converts it to a Javascript
 * Object.
 * It uses the '@aidin36/xmp2js' for the transformation. You can read the documents
 * of '@aidin36/xmp2js' to learn more about the output format.
 *
 * Note that your Javascript environment should provide TextDecoder.
 *
 * @param image - Data of the HEIC image in the form of Uint8Array
 * @returns A JS Object, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromHeicAsJs = (image: Uint8Array): XMP | undefined => {
  const xmpStr = readXmpFromHeic(image)
  if (xmpStr == null || xmpStr.length === 0) {
    return undefined
  }
  return xmp2js(xmpStr)
}

/**
 * Writes the XMP data to an image file in HEIC format.
 * This is the most portable overload. Because not every Javascript
 * environment supports TextEncoder. In those cases, you can encode your
 * XMP with what is available and pass it.
 *
 * Note that XMP needs to be in UTF-8 encoding.
 *
 * @param image - Data of the HEIC image in the form of Uint8Array
 * @param xmp - Encoded XMP
 * @returns The modified image
 */
export const writeXmpToHeic = (image: Uint8Array, xmp: Uint8Array): Uint8Array => heicWriteOrUpdateXmp(image, xmp)

/**
 * Writes the XMP data to an image file in HEIC format.
 *
 * @param image - Data of the HEIC image in the form of Uint8Array
 * @param xmp - Encoded XMP
 * @returns The modified image
 */
export const writeXmpToHeicAsString = (image: Uint8Array, xmp: string): Uint8Array => {
  if (TextEncoder === undefined) {
    throw Error('This method needs TextEncoder which is not available in your environment. You can try other methods.')
  }

  const encoder = new TextEncoder()
  const encodedXmp = encoder.encode(xmp)

  return heicWriteOrUpdateXmp(image, encodedXmp)
}
```

## Copyright

Copyright 2024 - 2025 Aidin Gharibnavaz - https://aidinhut.com

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
