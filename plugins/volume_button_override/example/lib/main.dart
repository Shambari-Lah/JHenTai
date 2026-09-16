import 'package:flutter/material.dart';
import 'package:volume_button_override/volume_button_override.dart';

void main() {
  runApp(const MyApp());
}

final class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Volume Button Override Example',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}

final class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

final class _HomeScreenState extends State<HomeScreen> {
  final VolumeButtonController _controller = VolumeButtonController();
  int _counter = 0;
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    _setupCallback();
  }

  void _setupCallback() {
    _controller.setButtonPressCallback((action) {
      debugPrint('Button pressed: ${action.id}');
    });
  }

  @override
  void dispose() {
    _stopListening();
    super.dispose();
  }

  Future<void> _startListening() async {
    if (_isListening) return;

    final upAction = ButtonAction(
      id: ButtonActionId.volumeUp,
      onAction: () {
        setState(() {
          _counter++;
        });
      },
    );

    final downAction = ButtonAction(
      id: ButtonActionId.volumeDown,
      onAction: () {
        setState(() {
          _counter--;
        });
      },
    );

    try {
      final result = await _controller.startListening(
        volumeUpAction: upAction,
        volumeDownAction: downAction,
      );

      setState(() {
        _isListening = result;
      });
    } catch (_) {}
  }

  Future<void> _stopListening() async {
    if (!_isListening) return;

    try {
      final result = await _controller.stopListening();
      setState(() {
        _isListening = !result;
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(appBar: _buildAppBar(context), body: _buildBody(context));
  }

  AppBar _buildAppBar(BuildContext context) {
    return AppBar(
      title: const Text('Volume Button Override Example'),
      backgroundColor: Theme.of(context).colorScheme.inversePrimary,
    );
  }

  Widget _buildBody(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Counter Value',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          Text('$_counter', style: Theme.of(context).textTheme.displayLarge),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _isListening ? _stopListening : _startListening,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: Text(_isListening ? 'Stop Listening' : 'Start Listening'),
          ),
          const SizedBox(height: 24),
          if (_isListening)
            const Text(
              'You can increase or decrease the counter by pressing the volume buttons.\n'
              'Volume up button: Increases the counter\n'
              'Volume down button: Decreases the counter',
              textAlign: TextAlign.center,
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
        ],
      ),
    );
  }
}
