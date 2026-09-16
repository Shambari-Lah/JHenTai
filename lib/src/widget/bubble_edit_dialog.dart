import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../model/visual_translation_annotation.dart';

/// 吹き出しタップ時に原文比較・翻訳文の編集を行うダイアログ
class BubbleEditDialog extends StatefulWidget {
  final VisualTranslationAnnotation annotation;
  final Function(VisualTranslationAnnotation updated)? onSave;

  const BubbleEditDialog({
    super.key,
    required this.annotation,
    this.onSave,
  });

  @override
  State<BubbleEditDialog> createState() => _BubbleEditDialogState();
}

class _BubbleEditDialogState extends State<BubbleEditDialog> {
  late TextEditingController _textController;
  late bool _isOnomatopoeia;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(text: widget.annotation.translatedText);
    _isOnomatopoeia = widget.annotation.isOnomatopoeia;
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(
            _isOnomatopoeia ? Icons.flash_on : Icons.chat_bubble_outline,
            color: _isOnomatopoeia ? Colors.amber : Colors.tealAccent,
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            _isOnomatopoeia ? '擬音（オノマトペ）' : '吹き出し翻訳',
            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 原文表示
            const Text(
              '原文 (Original Text):',
              style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white12),
              ),
              child: Text(
                widget.annotation.sourceText,
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),

            const SizedBox(height: 14),

            // 翻訳文編集
            const Text(
              '翻訳テキスト (Translated Text):',
              style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            TextField(
              controller: _textController,
              maxLines: 3,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF0F172A),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Colors.tealAccent),
                ),
                contentPadding: const EdgeInsets.all(10),
              ),
            ),

            const SizedBox(height: 12),

            // 擬音スイッチ
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('擬音・効果音スタイルを適用', style: TextStyle(color: Colors.white70, fontSize: 12)),
              value: _isOnomatopoeia,
              activeColor: Colors.amber,
              onChanged: (val) {
                setState(() {
                  _isOnomatopoeia = val;
                });
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('キャンセル', style: TextStyle(color: Colors.white60)),
        ),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.teal,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onPressed: () {
            widget.annotation.translatedText = _textController.text.trim();
            final updated = VisualTranslationAnnotation(
              id: widget.annotation.id,
              sourceText: widget.annotation.sourceText,
              translatedText: _textController.text.trim(),
              normalizedRect: widget.annotation.normalizedRect,
              angle: widget.annotation.angle,
              dominantColor: widget.annotation.dominantColor,
              isOnomatopoeia: _isOnomatopoeia,
              isVertical: widget.annotation.isVertical,
              textColor: widget.annotation.textColor,
              strokeColor: widget.annotation.strokeColor,
              strokeWidth: widget.annotation.strokeWidth,
            );
            widget.onSave?.call(updated);
            Navigator.of(context).pop();
          },
          icon: const Icon(Icons.check, size: 16),
          label: const Text('適用'),
        ),
      ],
    );
  }
}
