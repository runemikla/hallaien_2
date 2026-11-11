/** Crops an image to a centred square and scales it down to a small JPEG. */
export async function resizeToAvatar(file: File, size = 256): Promise<File> {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Kunne ikke behandle bildet')
    ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
        0, 0, size, size,
    )
    bitmap.close()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) throw new Error('Kunne ikke behandle bildet')
    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}
