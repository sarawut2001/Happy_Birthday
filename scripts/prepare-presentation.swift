// macOS: swift -suppress-warnings scripts/prepare-presentation.swift
// Rewrap the supplied H.264/AAC movie without re-encoding its picture or audio.
import AVFoundation
import AppKit
let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let source = root.appendingPathComponent("image/Presentaion.MOV")
let directory = root.appendingPathComponent("public/assets/personal/presentation", isDirectory: true)
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
let asset = AVURLAsset(url: source)
guard let exporter = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough), exporter.supportedFileTypes.contains(.mp4) else {
    fatalError("The supplied movie cannot be rewrapped as MP4 with passthrough.")
}
let temporary = directory.appendingPathComponent("presentation-preparing.mp4")
if FileManager.default.fileExists(atPath: temporary.path) { try FileManager.default.removeItem(at: temporary) }
exporter.outputURL = temporary
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true
var finished = false
exporter.exportAsynchronously { finished = true }
while !finished { RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05)) }
guard exporter.status == .completed else { throw exporter.error ?? NSError(domain: "PresentationExport", code: 1) }
let target = directory.appendingPathComponent("our-story.mp4")
if FileManager.default.fileExists(atPath: target.path) { try FileManager.default.removeItem(at: target) }
try FileManager.default.moveItem(at: temporary, to: target)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 1920, height: 1080)
let image = try generator.copyCGImage(at: CMTime(seconds: 10, preferredTimescale: 600), actualTime: nil)
let bitmap = NSBitmapImageRep(cgImage: image)
guard let poster = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.9]) else { fatalError("Could not create the poster.") }
try poster.write(to: directory.appendingPathComponent("our-story-poster.jpg"))
print("Prepared \(target.path): \(CMTimeGetSeconds(asset.duration)) seconds. Original MOV is unchanged.")
