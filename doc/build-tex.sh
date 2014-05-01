#!/bin/bash
# LaTex build script
# on .tex file change

pdflatex -aux-directory="build" -output-directory="build" document
pdflatex -aux-directory="build" -output-directory="build" document