# XMP Javascript package

It can read and write XMP data from/to various file formats.

## Supported Formats

| Format | Read | Write |
| :----: | :--: | :---: |
|  JPEG  |  ✓   |   ╳   |
|  HEIC  |  ✓   |   ╳   |

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

## API

## Copyright

Copyright 2024 - 2025 Aidin Gharibnavaz

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
