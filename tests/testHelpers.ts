import libheif from 'libheif-js'

export const parseImageWithLibHeif = async (imageData: Uint8Array) => {
  const decoder = new libheif.HeifDecoder()
  const decodeResult = decoder.decode(imageData.buffer)
  const decodedImage = decodeResult[0]

  const width = decodedImage.get_width()
  const height = decodedImage.get_height()

  // I'm not sure how this works. I copied it from libheif-js tests.
  // https://github.com/catdad-experiments/libheif-js/blob/fe8e9c29440b839910be9dc32e8d2b826c8217ca/test/libheif.test.js#L125
  const decodedData: Uint8ClampedArray = await new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decodedImage.display({ data: new Uint8ClampedArray(width * height * 4), width, height }, (displayData: any) => {
      if (!displayData) {
        reject(new Error('Error parsing the image with libheif-js'))
      }
      resolve(displayData.data)
    })
  })

  return {
    width,
    height,
    decodedData,
  }
}
